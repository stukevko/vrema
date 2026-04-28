import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";

/**
 * Edge-compatible auth config – NO Prisma adapter, NO Node.js-only imports.
 * Used in proxy.ts (middleware) which runs in Edge runtime.
 */
export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  providers: (() => {
    const providers: Provider[] = [
      Credentials({
        credentials: {
          email: {},
          password: {},
        },
        // Actual verification happens in auth.ts, not here
        authorize: () => null,
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
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      if (pathname === "/") return true;
      const PUBLIC_PREFIXES = [
        "/auth/",
        "/partner-login",
        "/terminal",
        "/pricing",
        "/api/auth",
        "/api/webhooks",
        "/_next",
        "/favicon",
      ];
      if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;

      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.userId = (user as { id?: string }).id;
        token.companyId = (user as { companyId?: string }).companyId;
        token.role = (user as { role?: string }).role;
        token.plan = (user as { plan?: string }).plan;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.companyId = token.companyId as string;
        session.user.role = token.role as string;
        session.user.plan = token.plan as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  session: { strategy: "jwt" },
};
