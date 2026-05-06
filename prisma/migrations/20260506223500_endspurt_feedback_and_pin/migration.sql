-- Track whether ticket replies were seen by the ticket creator
ALTER TABLE "Ticket"
ADD COLUMN "userSeenResponseAt" TIMESTAMP(3);
