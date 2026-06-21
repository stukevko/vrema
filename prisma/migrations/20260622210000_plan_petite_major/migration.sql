-- All-In Tarife: Petite (29 €, bis 50 MA) + Major (90 €, unbegrenzt)

CREATE TYPE "Plan_new" AS ENUM ('PETITE', 'MAJOR');

ALTER TABLE "Company" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "AffiliateEarning" ALTER COLUMN "plan" DROP DEFAULT;

ALTER TABLE "Company"
  ALTER COLUMN "plan" TYPE "Plan_new"
  USING (
    CASE "plan"::text
      WHEN 'ENTERPRISE' THEN 'MAJOR'::"Plan_new"
      WHEN 'BUSINESS' THEN 'MAJOR'::"Plan_new"
      WHEN 'MAJOR' THEN 'MAJOR'::"Plan_new"
      WHEN 'PETITE' THEN 'PETITE'::"Plan_new"
      ELSE 'PETITE'::"Plan_new"
    END
  );

ALTER TABLE "AffiliateEarning"
  ALTER COLUMN "plan" TYPE "Plan_new"
  USING (
    CASE "plan"::text
      WHEN 'BUSINESS' THEN 'MAJOR'::"Plan_new"
      WHEN 'ENTERPRISE' THEN 'MAJOR'::"Plan_new"
      WHEN 'MAJOR' THEN 'MAJOR'::"Plan_new"
      WHEN 'PETITE' THEN 'PETITE'::"Plan_new"
      ELSE 'PETITE'::"Plan_new"
    END
  );

DROP TYPE "Plan";
ALTER TYPE "Plan_new" RENAME TO "Plan";

ALTER TABLE "Company" ALTER COLUMN "plan" SET DEFAULT 'PETITE'::"Plan";
ALTER TABLE "AffiliateEarning" ALTER COLUMN "plan" SET DEFAULT 'PETITE'::"Plan";
