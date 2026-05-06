"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant-guard";
import type { TicketStatus, TicketType } from "@prisma/client";

export async function createSupportTicket(input: {
  subject: string;
  message: string;
  type: TicketType;
}) {
  const { userId, companyId } = await requireTenant();
  const subject = input.subject.trim();
  const message = input.message.trim();
  if (subject.length < 3 || message.length < 5) {
    throw new Error("Bitte Betreff und Nachricht vollständig ausfüllen.");
  }

  await db.ticket.create({
    data: {
      userId,
      orgId: companyId,
      subject,
      message,
      type: input.type,
      status: "OPEN",
    },
  });

  revalidatePath("/dashboard");
}

export async function getMyUnreadSupportRepliesCount() {
  const { userId, companyId } = await requireTenant();
  return db.ticket.count({
    where: {
      userId,
      orgId: companyId,
      response: { not: null },
      respondedAt: { not: null },
      userSeenResponseAt: null,
    },
  });
}

export async function markMySupportRepliesSeen() {
  const { userId, companyId } = await requireTenant();
  await db.ticket.updateMany({
    where: {
      userId,
      orgId: companyId,
      response: { not: null },
      respondedAt: { not: null },
      userSeenResponseAt: null,
    },
    data: {
      userSeenResponseAt: new Date(),
    },
  });
}

export async function listSupportTicketsForSuperAdmin() {
  const { role, userId } = await requireTenant();
  if (role !== "SUPER_ADMIN" && userId !== process.env.SUPER_ADMIN_USER_ID) {
    throw new Error("Keine Berechtigung.");
  }

  return db.ticket.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      user: { select: { name: true, email: true } },
      org: { select: { name: true } },
    },
  });
}

export async function replyToSupportTicket(input: {
  ticketId: string;
  response: string;
  status: TicketStatus;
}) {
  const { role, userId } = await requireTenant();
  if (role !== "SUPER_ADMIN" && userId !== process.env.SUPER_ADMIN_USER_ID) {
    throw new Error("Keine Berechtigung.");
  }

  await db.ticket.update({
    where: { id: input.ticketId },
    data: {
      response: input.response.trim() || null,
      status: input.status,
      respondedBy: userId,
      respondedAt: new Date(),
      userSeenResponseAt: null,
    },
  });

  revalidatePath("/dashboard/super-admin/tickets");
}
