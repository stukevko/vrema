import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateVerificationToken } from "@/lib/auth/tokens";
import { sendTeamInviteWelcomeEmail, sendVerificationEmail } from "@/lib/email/transactional";
import {
  EMPLOYEE_NUMBER_AUTO_START,
  nextNumericEmployeeNumber,
} from "@/lib/team/allocate-employee-number";
import {
  normalizeReferralCode,
  isFlyerReferralCode,
} from "@/lib/trial/referral";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültige Anfrage." },
      { status: 400 }
    );
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json(
      { error: "Ungültige Anfrage." },
      { status: 400 }
    );
  }

  try {
    const { name, email, password, companyName, plan, affiliateCode, inviteCode, inviteOrgId, inviteRole } =
      payload as Record<string, unknown>;
    const isInviteFlow = typeof inviteCode === "string" && inviteCode.trim().length > 0;

    // ── Input validation ────────────────────────────────────────────────────
    // Alle Pflichtfelder müssen Strings sein – schützt vor .trim()-Crash bei
    // fehlerhaften/böswilligen Payloads (z. B. { companyName: 123 }).
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      (!isInviteFlow && (typeof companyName !== "string" || !companyName.trim()))
    ) {
      return NextResponse.json(
        { error: "Alle Felder sind erforderlich." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Ungültige E-Mail-Adresse." },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
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

    // ── Hash password (cost factor 12) ──────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12);

    // ── Invite flow: attach user to existing company ────────────────────────
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = String(name).trim();

    if (isInviteFlow) {
      if (
        typeof inviteOrgId !== "string" ||
        !inviteOrgId.trim() ||
        (inviteRole !== "USER" && inviteRole !== "MANAGER")
      ) {
        return NextResponse.json(
          { error: "Einladungsdaten sind unvollständig oder ungültig." },
          { status: 400 }
        );
      }

      const normalizedInviteCode = inviteCode.trim().toLowerCase();
      const invite = await db.inviteLink.findFirst({
        where: {
          code: normalizedInviteCode,
          orgId: inviteOrgId.trim(),
          role: inviteRole,
          expiresAt: { gt: new Date() },
        },
        select: { id: true, orgId: true, role: true, usedCount: true, maxUses: true, org: { select: { name: true } } },
      });

      const usageExceeded = invite?.maxUses !== null && invite !== null && invite.usedCount >= invite.maxUses;
      if (!invite || usageExceeded) {
        return NextResponse.json(
          { error: "Dieser Einladungs-Link ist leider abgelaufen oder wurde zu oft verwendet." },
          { status: 400 }
        );
      }

      const orgPlan = await db.company.findUnique({
        where: { id: invite.orgId },
        select: { plan: true },
      });
      const { assertCanAddEmployees } = await import("@/lib/plan-limits");
      try {
        await assertCanAddEmployees(invite.orgId, orgPlan?.plan ?? "PETITE", 1);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Plan-Limit erreicht." },
          { status: 400 },
        );
      }

      await db.$transaction(async (tx) => {
        const employeeNumber = await nextNumericEmployeeNumber(invite.orgId, tx);
        await tx.user.create({
          data: {
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            role:
              invite.role === "MANAGER"
                ? "MANAGER"
                : invite.role === "ADVISOR"
                  ? "ADVISOR"
                  : "EMPLOYEE",
            companyId: invite.orgId,
            emailVerified: new Date(),
            employeeNumber,
          },
        });

        await tx.inviteLink.update({
          where: { id: invite.id },
          data: { usedCount: { increment: 1 } },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    );

      // Keep mail logic aligned with standard registration: send an email right after persistence.
      await sendTeamInviteWelcomeEmail({
        recipientName: normalizedName,
        recipientEmail: normalizedEmail,
        companyName: invite.org.name,
      });

      return NextResponse.json({ success: true }, { status: 201 });
    }

    // ── Standard flow: create company + owner ───────────────────────────────
    const baseSlug = String(companyName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const refRaw =
      typeof affiliateCode === "string" && affiliateCode.trim()
        ? normalizeReferralCode(affiliateCode)
        : "";

    let resolvedAffiliateId: string | undefined;
    let referredBy: string | undefined;

    if (refRaw) {
      const affiliate = await db.affiliate.findUnique({
        where: { code: refRaw },
        select: { id: true },
      });
      if (affiliate) {
        resolvedAffiliateId = affiliate.id;
      } else if (isFlyerReferralCode(refRaw)) {
        referredBy = refRaw;
      }
    }

    const safePlan: "PETITE" | "MAJOR" = plan === "MAJOR" ? "MAJOR" : "PETITE";

    const company = await db.company.create({
      data: {
        name: String(companyName).trim(),
        slug: uniqueSlug,
        plan: safePlan,
        tenantStatus: "PENDING",
        referredBy,
        isActive: false,
        affiliateId: resolvedAffiliateId,
        users: {
          create: {
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword, // ← stored on User, not Account
            role: "COMPANY_OWNER",
            employeeNumber: String(EMPLOYEE_NUMBER_AUTO_START),
          },
        },
      },
    });

    const { token } = await generateVerificationToken(normalizedEmail);
    const baseUrl = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
    const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;
    await sendVerificationEmail({
      recipientName: normalizedName,
      recipientEmail: normalizedEmail,
      verifyUrl,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[register] Unexpected error:", err);
    return NextResponse.json(
      { error: "Registrierung fehlgeschlagen. Bitte erneut versuchen." },
      { status: 500 }
    );
  }
}
