import { PrismaClient } from "@prisma/client";
import { runMatureAffiliateEarnings } from "../src/lib/affiliate-earnings";

const prisma = new PrismaClient();

async function main() {
  const report = await runMatureAffiliateEarnings(prisma);
  console.log("=== Affiliate Maturation Report ===");
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error("[affiliate-mature] failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
