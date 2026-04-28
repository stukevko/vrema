import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { generateVerificationToken } from "@/lib/actions/auth";
import { sendVerificationEmail } from "@/lib/actions/emails";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, companyName, plan, affiliateCode } = await req.json();

    // ── Input validation ────────────────────────────────────────────────────
    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "Alle Felder sind erforderlich." },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Ungültige E-Mail-Adresse." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.` },
        { status: 400 }
      );
    }

    // ── Duplicate check ─────────────────────────────────────────────────────
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Diese E-Mail ist bereits registriert." },
        { status: 409 }
      );
    }

    // ── Slug generation ─────────────────────────────────────────────────────
    const baseSlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    // ── Hash password (cost factor 12) ──────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12);

    // ── Create company + owner atomically ───────────────────────────────────
    const normalizedEmail = email.toLowerCase().trim();

    let resolvedAffiliateId: string | undefined;
    if (typeof affiliateCode === "string" && affiliateCode.trim()) {
      const code = affiliateCode.trim().toLowerCase();
      const affiliate = await db.affiliate.findUnique({
        where: { code },
        select: { id: true },
      });
      if (affiliate) {
        resolvedAffiliateId = affiliate.id;
      }
    }

    const company = await db.company.create({
      data: {
        name: companyName.trim(),
        slug: uniqueSlug,
        plan: (["STARTER", "BUSINESS", "ENTERPRISE"] as const).includes(plan)
          ? plan
          : "STARTER",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        affiliateId: resolvedAffiliateId,
        users: {
          create: {
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,   // ← stored on User, not Account
            role: "COMPANY_OWNER",
          },
        },
      },
    });

    const { token } = await generateVerificationToken(normalizedEmail);
    const baseUrl = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;
    await sendVerificationEmail({
      recipientName: name.trim(),
      recipientEmail: normalizedEmail,
      verifyUrl,
    });

    return NextResponse.json(
      { success: true, companyId: company.id },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register] Unexpected error:", err);
    return NextResponse.json(
      { error: "Registrierung fehlgeschlagen. Bitte erneut versuchen." },
      { status: 500 }
    );
  }
}
