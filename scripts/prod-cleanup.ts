import { createScriptPrisma } from "./prisma-script-client";

const prisma = createScriptPrisma();

function isTestEmail(email: string) {
  const normalized = email.toLowerCase().trim();
  return normalized.endsWith("@test.de") || normalized.includes("+test");
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, companyId: true },
  });

  const testUsers = users.filter((user) => isTestEmail(user.email));
  const testUserIds = new Set(testUsers.map((user) => user.id));

  const companyToUsers = new Map<string, { id: string; email: string }[]>();
  for (const user of users) {
    const group = companyToUsers.get(user.companyId) ?? [];
    group.push({ id: user.id, email: user.email });
    companyToUsers.set(user.companyId, group);
  }

  const companyIdsToDelete: string[] = [];
  for (const [companyId, companyUsers] of companyToUsers.entries()) {
    const hasOnlyTestUsers =
      companyUsers.length > 0 && companyUsers.every((u) => testUserIds.has(u.id));
    if (hasOnlyTestUsers) companyIdsToDelete.push(companyId);
  }

  const deleteUsersInMixedCompanies = testUsers.filter(
    (u) => !companyIdsToDelete.includes(u.companyId)
  );

  const result = await prisma.$transaction(async (tx) => {
    // Deleting companies cascades users, logs, vacations and schedules.
    const deletedCompanies =
      companyIdsToDelete.length > 0
        ? await tx.company.deleteMany({ where: { id: { in: companyIdsToDelete } } })
        : { count: 0 };

    // For mixed companies, explicitly delete dependent rows then the users.
    let deletedLogs = { count: 0 };
    let deletedVacations = { count: 0 };
    let deletedSchedules = { count: 0 };
    let deletedUsers = { count: 0 };

    if (deleteUsersInMixedCompanies.length > 0) {
      const ids = deleteUsersInMixedCompanies.map((u) => u.id);
      deletedLogs = await tx.workLog.deleteMany({ where: { userId: { in: ids } } });
      deletedVacations = await tx.vacationRequest.deleteMany({ where: { userId: { in: ids } } });
      deletedSchedules = await tx.workSchedule.deleteMany({ where: { userId: { in: ids } } });
      await tx.account.deleteMany({ where: { userId: { in: ids } } });
      await tx.session.deleteMany({ where: { userId: { in: ids } } });
      deletedUsers = await tx.user.deleteMany({ where: { id: { in: ids } } });
    }

    return {
      deletedCompanies: deletedCompanies.count,
      deletedUsers: deletedUsers.count,
      deletedLogs: deletedLogs.count,
      deletedVacations: deletedVacations.count,
      deletedSchedules: deletedSchedules.count,
      matchedTestUsers: testUsers.length,
    };
  });

  console.log("=== Production Cleanup ===");
  console.log(`Matched test users: ${result.matchedTestUsers}`);
  console.log(`Deleted companies: ${result.deletedCompanies}`);
  console.log(`Deleted users (mixed companies): ${result.deletedUsers}`);
  console.log(`Deleted work logs (mixed companies): ${result.deletedLogs}`);
  console.log(`Deleted vacations (mixed companies): ${result.deletedVacations}`);
  console.log(`Deleted schedules (mixed companies): ${result.deletedSchedules}`);
}

main()
  .catch((error) => {
    console.error("[prod-cleanup] failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
