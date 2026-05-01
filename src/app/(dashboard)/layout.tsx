import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardMobileBottomNav, DashboardSidebar } from "@/components/dashboard/Sidebar";
import { DashboardTopbar } from "@/components/dashboard/Topbar";
import { db } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }
  if (session.user.role === "AFFILIATE_PARTNER") {
    redirect("/partner/dashboard");
  }
  if (!session.user.companyId) {
    redirect("/setup");
  }

  const requireCard = process.env.REQUIRE_CARD_ON_SIGNUP === "true";
  if (requireCard && session.user.role !== "SUPER_ADMIN") {
    const company = await db.company.findUnique({
      where: { id: session.user.companyId },
      select: { paymentMethodVerifiedAt: true },
    });
    if (!company?.paymentMethodVerifiedAt) {
      redirect("/setup?payment=required");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <DashboardSidebar
        role={session.user.role ?? "EMPLOYEE"}
        plan={session.user.plan ?? "STARTER"}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <DashboardTopbar user={session.user} />
        <main className="flex-1 px-4 py-4 pb-24 md:p-6 md:pb-6 overflow-auto">
          {children}
          <footer className="mt-8 mb-2 text-center text-xs text-muted-foreground">
            VREMA – Intelligente Zeiterfassung
          </footer>
        </main>
      </div>
      <DashboardMobileBottomNav role={session.user.role ?? "EMPLOYEE"} />
    </div>
  );
}
