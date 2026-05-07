import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "@/components/dashboard/DashboardLayoutClient";
import { db } from "@/lib/db";
import { getMyUnreadSupportRepliesCount, countOpenSupportTicketsForSuperAdmin } from "@/lib/actions/support";

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

  let supportUnreadCount = 0;
  let superOpenTickets = 0;
  try {
    supportUnreadCount = await getMyUnreadSupportRepliesCount();
  } catch {
    supportUnreadCount = 0;
  }
  try {
    superOpenTickets = await countOpenSupportTicketsForSuperAdmin();
  } catch {
    superOpenTickets = 0;
  }

  return (
    <DashboardLayoutClient
      role={session.user.role ?? "EMPLOYEE"}
      plan={session.user.plan ?? "STARTER"}
      user={session.user}
      supportUnreadCount={supportUnreadCount}
      initialSuperOpenTickets={superOpenTickets}
    >
      {children}
    </DashboardLayoutClient>
  );
}
