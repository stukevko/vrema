import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Passkey from "next-auth/providers/passkey";
import type { Provider } from "next-auth/providers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { getCachedUserProfile } from "@/lib/session-user-profile";

// Custom error so the login page receives a clear, typed reason.
class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class UnverifiedEmailError extends CredentialsSignin {
  code = "unverified_email";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  experimental: { enableWebAuthn: true },
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: (() => {
    const providers: Provider[] = [
      Passkey({
        name: "Passkey",
      }),
      Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim();
        const password = credentials?.password as string | undefined;

        if (!email || !password) throw new InvalidCredentialsError();

        // ── 1) Try standard user login ─────────────────────────────────────
        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            password: true,
            role: true,
            isActive: true,
            companyId: true,
            emailVerified: true,
            company: { select: { plan: true, isActive: true } },
          },
        });

        if (user) {
          // Account deactivated
          if (!user.isActive || !user.company?.isActive) throw new InvalidCredentialsError();

          // No password set (e.g. OAuth-only account)
          if (!user.password) throw new InvalidCredentialsError();

          if (!user.emailVerified) throw new UnverifiedEmailError();

          // ── bcrypt comparison (timing-safe) ────────────────────────────────
          const passwordMatch = await bcrypt.compare(password, user.password);
          if (!passwordMatch) throw new InvalidCredentialsError();

          // ── Return minimal session payload ─────────────────────────────────
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            companyId: user.companyId,
            role: user.role as string,
            plan: user.company?.plan as string,
            accountType: "user",
          };
        }

        // ── 2) Fallback: affiliate partner login ───────────────────────────
        const affiliateRows = await db.$queryRaw<
          Array<{ id: string; email: string | null; name: string; passwordHash: string | null; isActive: boolean | null }>
        >`SELECT "id","email","name","passwordHash","isActive" FROM "Affiliate" WHERE lower("email") = ${email} LIMIT 1`;
        const affiliate = affiliateRows[0] ?? null;
        if (!affiliate?.isActive) throw new InvalidCredentialsError();
        if (!affiliate?.passwordHash) throw new InvalidCredentialsError();
        const partnerMatch = await bcrypt.compare(password, affiliate.passwordHash);
        if (!partnerMatch) throw new InvalidCredentialsError();
        await db.$executeRaw`UPDATE "Affiliate" SET "lastLoginAt" = NOW() WHERE "id" = ${affiliate.id}`;
        return {
          id: `affiliate:${affiliate.id}`,
          email: affiliate.email,
          name: affiliate.name,
          image: null,
          companyId: "",
          role: "AFFILIATE_PARTNER",
          plan: "STARTER",
          affiliateId: affiliate.id,
          accountType: "affiliate",
        };
      },
      }),
    ];

    if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
      providers.push(
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
      );
    }

    return providers;
  })(),
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as { id?: string }).id ?? token.userId;
        token.companyId = (user as { companyId?: string }).companyId ?? token.companyId;
        token.role = (user as { role?: string }).role ?? token.role;
        token.plan = (user as { plan?: string }).plan ?? token.plan;
        token.affiliateId = (user as { affiliateId?: string }).affiliateId ?? token.affiliateId;
        token.accountType = (user as { accountType?: "user" | "affiliate" }).accountType ?? token.accountType;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = (token.userId as string) ?? "";
      session.user.companyId = (token.companyId as string) ?? "";
      session.user.role = (token.role as string) ?? "EMPLOYEE";
      session.user.plan = (token.plan as string) ?? "STARTER";
      session.user.affiliateId = (token.affiliateId as string | undefined) ?? undefined;
      session.user.accountType = (token.accountType as "user" | "affiliate" | undefined) ?? undefined;

      const userId = session.user.id;
      if (userId && !userId.startsWith("affiliate:")) {
        const row = await getCachedUserProfile(userId);
        if (row) {
          session.user.name = row.name ?? session.user.name ?? null;
          session.user.email = row.email ?? session.user.email ?? null;
          if (row.image?.startsWith("data:")) {
            session.user.image = "/api/user-avatar";
          } else {
            session.user.image = row.image ?? null;
          }
        }
      }

      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;
      if (account?.provider === "passkey") return true;

      const dbUser = await db.user.findUnique({
        where: { email: user.email?.toLowerCase().trim() ?? "" },
        select: { emailVerified: true },
      });

      if (!user?.email) return false;

      if (!dbUser?.emailVerified) {
        throw new Error("Bitte verifizieren Sie zuerst Ihre E-Mail-Adresse.");
      }

      return true;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
});
