import { createScriptPrisma } from "./prisma-script-client";
import { createAbsentEntriesForMissingShifts } from "../src/lib/attendance";

const prisma = createScriptPrisma();

async function main() {
  const report = await createAbsentEntriesForMissingShifts(prisma);
  console.log("=== Absent Job Report ===");
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error("[mark-absent] failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
