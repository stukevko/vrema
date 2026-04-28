import { PrismaClient } from "@prisma/client";
import { createAbsentEntriesForMissingShifts } from "../src/lib/attendance";

const prisma = new PrismaClient();

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
