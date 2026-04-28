import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      companyId: string;
      role: string;
      plan: string;
      affiliateId?: string;
      accountType?: "user" | "affiliate";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    companyId?: string;
    role?: string;
    plan?: string;
    affiliateId?: string;
    accountType?: "user" | "affiliate";
  }
}
