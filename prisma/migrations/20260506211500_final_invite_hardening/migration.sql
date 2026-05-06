-- Add optional max usage limit for invite links (NULL = unlimited)
ALTER TABLE "InviteLink"
ADD COLUMN "maxUses" INTEGER;
