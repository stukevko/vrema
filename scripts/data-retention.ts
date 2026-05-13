import { createScriptPrisma } from "./prisma-script-client";
import { runDataRetention } from "../src/lib/data-retention";

const prisma = createScriptPrisma();

async function main() {
  const report = await runDataRetention(prisma);
  console.log("=== Data Retention Report ===");
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error("[data-retention] failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
