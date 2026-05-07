-- Erweitert Ticket-Workflow (beantwortet / Feedback-Kategorie)
ALTER TYPE "TicketStatus" ADD VALUE 'RESOLVED';
ALTER TYPE "TicketType" ADD VALUE 'FEEDBACK';
