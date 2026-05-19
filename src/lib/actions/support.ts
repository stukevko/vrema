"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/tenant-guard";
import { TicketStatus, TicketType } from "@prisma/client";

const RELEVANT_TYPES: TicketType[] = ["QUESTION", "BUG", "FEEDBACK", "FEATURE"];

function parseTicketType(raw: string): TicketType {
  const u = raw.toUpperCase();
  if (u === "QUESTION" || u === "BUG" || u === "FEEDBACK" || u === "FEATURE") return u;
  return "QUESTION";
}

export async function createSupportTicket(input: { subject: string; message: string; type: TicketType }) {
  const { userId, companyId } = await requireTenant();
  const subject = input.subject.trim();
  const message = input.message.trim();
  if (subject.length < 3 || message.length < 5) {
    throw new Error("Bitte Betreff und Nachricht vollständig ausfüllen.");
  }
  if (!RELEVANT_TYPES.includes(input.type)) {
    throw new Error("Ungültige Kategorie.");
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
  revalidatePath("/dashboard/support");
  revalidatePath("/dashboard/admin/support");
  revalidatePath("/dashboard/support");
  revalidatePath("/dashboard/super-admin/tickets");
}

export async function createSupportTicketFormAction(formData: FormData) {
  const subject = String(formData.get("subject") ?? "");
  const message = String(formData.get("message") ?? "");
  const type = parseTicketType(String(formData.get("type") ?? "QUESTION"));
  await createSupportTicket({ subject, message, type });
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
  revalidatePath("/dashboard/support");
  revalidatePath("/dashboard");
}

/** Als gelesen markieren, sobald der Nutzer eine konkrete Antwort im Chat öffnet (Badge bleibt sonst bestehen). */
export async function markSupportTicketReplySeen(ticketId: string) {
  const { userId, companyId } = await requireTenant();
  await db.ticket.updateMany({
    where: {
      id: ticketId,
      userId,
      orgId: companyId,
      response: { not: null },
      respondedAt: { not: null },
      userSeenResponseAt: null,
    },
    data: { userSeenResponseAt: new Date() },
  });
  revalidatePath("/dashboard/support");
  revalidatePath("/dashboard");
}

export async function listMySupportTickets() {
  const { userId, companyId } = await requireTenant();
  return db.ticket.findMany({
    where: { userId, orgId: companyId },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      subject: true,
      message: true,
      status: true,
      type: true,
      response: true,
      respondedAt: true,
      createdAt: true,
      userSeenResponseAt: true,
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

export async function listOrgSupportTicketsForManagers() {
  const { companyId, role } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER"].includes(role ?? "")) {
    throw new Error("Keine Berechtigung.");
  }

  return db.ticket.findMany({
    where: { orgId: companyId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      user: { select: { name: true, email: true } },
    },
  });
}

/** Tickets, die als Super-Admin noch Aufmerksamkeit brauchen (nicht beantwortet/gelöst). */
export async function countOpenSupportTicketsForSuperAdmin() {
  const { role, userId } = await requireTenant();
  if (role !== "SUPER_ADMIN" && userId !== process.env.SUPER_ADMIN_USER_ID) {
    return 0;
  }
  return db.ticket.count({
    where: { status: { in: [TicketStatus.OPEN, TicketStatus.PENDING] } },
  });
}

export async function replyToSupportTicket(input: { ticketId: string; response: string; status: TicketStatus }) {
  const { role, userId } = await requireTenant();
  if (role !== "SUPER_ADMIN" && userId !== process.env.SUPER_ADMIN_USER_ID) {
    throw new Error("Keine Berechtigung.");
  }

  const trimmed = input.response.trim();
  const nextStatus: TicketStatus = trimmed.length > 0 ? TicketStatus.RESOLVED : input.status;

  await db.ticket.update({
    where: { id: input.ticketId },
    data: {
      ...(trimmed.length > 0 ? { response: trimmed, userSeenResponseAt: null } : {}),
      status: nextStatus,
      respondedBy: userId,
      respondedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/super-admin/tickets");
  revalidatePath("/dashboard/support");
  revalidatePath("/dashboard/admin/support");
  revalidatePath("/dashboard/support");
}

export async function replyToOrgSupportTicketFormAction(formData: FormData) {
  const { companyId, role, userId } = await requireTenant();
  if (!["COMPANY_OWNER", "MANAGER"].includes(role ?? "")) {
    throw new Error("Keine Berechtigung.");
  }
  const ticketId = String(formData.get("ticketId") ?? "");
  const responseRaw = String(formData.get("response") ?? "");
  const statusRaw = String(formData.get("status") ?? "PENDING") as TicketStatus;
  if (!ticketId) throw new Error("Ticket fehlt.");

  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, orgId: companyId },
    select: { id: true },
  });
  if (!ticket) throw new Error("Ticket nicht gefunden.");

  const trimmed = responseRaw.trim();
  const allowed: TicketStatus[] = [
    TicketStatus.OPEN,
    TicketStatus.PENDING,
    TicketStatus.CLOSED,
    TicketStatus.RESOLVED,
  ];
  const selected = allowed.includes(statusRaw) ? statusRaw : TicketStatus.PENDING;
  const nextStatus: TicketStatus = trimmed.length > 0 ? TicketStatus.RESOLVED : selected;

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      ...(trimmed.length > 0 ? { response: trimmed, userSeenResponseAt: null } : {}),
      status: nextStatus,
      respondedBy: userId,
      respondedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/admin/support");
  revalidatePath("/dashboard/support");
  revalidatePath("/dashboard/support");
}

export async function replyToSupportTicketFormAction(formData: FormData) {
  const ticketId = String(formData.get("ticketId") ?? "");
  const response = String(formData.get("response") ?? "");
  const statusRaw = String(formData.get("status") ?? "PENDING") as TicketStatus;
  const allowed = [TicketStatus.OPEN, TicketStatus.PENDING, TicketStatus.CLOSED, TicketStatus.RESOLVED];
  const status = allowed.includes(statusRaw) ? statusRaw : TicketStatus.PENDING;
  await replyToSupportTicket({ ticketId, response, status });
}
