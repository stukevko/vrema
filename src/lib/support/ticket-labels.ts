import type { TicketStatus, TicketType } from "@prisma/client";

export function ticketStatusDe(status: TicketStatus): string {
  switch (status) {
    case "OPEN":
      return "Offen";
    case "PENDING":
      return "In Bearbeitung";
    case "RESOLVED":
      return "Beantwortet";
    case "CLOSED":
      return "Gelöst";
    default:
      return status;
  }
}

export function ticketTypeDe(type: TicketType): string {
  switch (type) {
    case "QUESTION":
      return "Frage";
    case "BUG":
      return "Fehler";
    case "FEEDBACK":
      return "Feedback";
    case "FEATURE":
      return "Feature";
    default:
      return type;
  }
}
