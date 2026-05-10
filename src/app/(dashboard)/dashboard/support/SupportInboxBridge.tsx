"use client";

import { useRouter } from "next/navigation";
import { SupportTicketInbox } from "@/components/dashboard/SupportTicketInbox";

export function SupportInboxBridge() {
  const router = useRouter();
  return <SupportTicketInbox variant="page" onActivity={() => router.refresh()} />;
}
