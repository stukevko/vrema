import bcrypt from "bcryptjs";
import { PrismaClient, VacationStatus, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function main() {
  const companySlug = "vrema-solutions";

  const existingCompany = await prisma.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });

  if (existingCompany) {
    await prisma.shiftTaskList.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.shift.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.taskTemplate.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.vacationRequest.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.workLog.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.user.deleteMany({ where: { companyId: existingCompany.id } });
    await prisma.company.delete({ where: { id: existingCompany.id } });
  }

  const company = await prisma.company.create({
    data: {
      name: "VREMA Solutions",
      slug: companySlug,
      plan: "BUSINESS",
      trialEndsAt: addHours(new Date(), 24 * 14),
      isActive: true,
    },
  });

  const passwordHash = await bcrypt.hash("DemoPass!123", 12);

  type StaffSeed = {
    name: string;
    email: string;
    role: UserRole;
    weeklyHours: number;
    vacationDays: number;
    pin: string;
    staffingRole?: string;
  };

  const staff: StaffSeed[] = [
    { name: "Kevin Admin", email: "kevin@vrema.solutions", role: UserRole.COMPANY_OWNER, weeklyHours: 40, vacationDays: 30, pin: "1234" },
    { name: "Mia Manager", email: "mia@vrema.solutions", role: UserRole.MANAGER, weeklyHours: 40, vacationDays: 28, pin: "2222" },
    {
      name: "Max Mustermann",
      email: "max@vrema.solutions",
      role: UserRole.EMPLOYEE,
      weeklyHours: 40,
      vacationDays: 25,
      pin: "3333",
      staffingRole: "Bar",
    },
    { name: "Sophie Bauer", email: "sophie@vrema.solutions", role: UserRole.EMPLOYEE, weeklyHours: 38, vacationDays: 27, pin: "4444" },
    { name: "Luca Weber", email: "luca@vrema.solutions", role: UserRole.EMPLOYEE, weeklyHours: 35, vacationDays: 26, pin: "5555" },
  ];

  const users = await Promise.all(
    staff.map(async (member, idx) => {
      const pinHash = await bcrypt.hash(member.pin, 12);
      return prisma.user.create({
        data: {
          companyId: company.id,
          name: member.name,
          email: member.email,
          role: member.role,
          password: passwordHash,
          terminalPinHash: pinHash,
          weeklyHours: member.weeklyHours,
          vacationDays: member.vacationDays,
          ...(member.staffingRole ? { staffingRole: member.staffingRole } : {}),
          employeeNumber: `EMP-${(idx + 1).toString().padStart(3, "0")}`,
          emailVerified: new Date(),
          isActive: true,
        },
      });
    })
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 1; dayOffset <= 30; dayOffset += 1) {
    const target = new Date(today);
    target.setDate(today.getDate() - dayOffset);
    const weekday = target.getDay();
    if (weekday === 0 || weekday === 6) continue;

    for (let i = 0; i < users.length; i += 1) {
      const user = users[i];
      const startHour = 7 + (i % 3);
      const clockIn = new Date(target);
      clockIn.setHours(startHour, 10 + i * 3, 0, 0);

      const workedHours = 7.8 + ((dayOffset + i) % 4) * 0.2;
      const clockOut = addHours(clockIn, workedHours);
      await prisma.workLog.create({
        data: {
          companyId: company.id,
          userId: user.id,
          clockIn,
          clockOut,
          breakMins: 30,
          note: null,
        },
      });
    }
  }

  const owner = users[0];
  const manager = users[1];
  const max = users[2];
  const sophie = users[3];
  const luca = users[4];

  await prisma.taskTemplate.create({
    data: {
      companyId: company.id,
      name: "Schlussdienst Bar",
      staffingRole: "Bar",
      isDefault: false,
      items: {
        create: [
          { title: "Kaffeemaschine reinigen", sortOrder: 0 },
          { title: "Terrasse abschließen", sortOrder: 1 },
          { title: "Kassensturz machen", sortOrder: 2 },
          { title: "Licht aus", sortOrder: 3 },
          { title: "Fenster prüfen", sortOrder: 4 },
        ],
      },
    },
  });

  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    await prisma.shift.create({
      data: {
        companyId: company.id,
        userId: max.id,
        dayOfWeek,
        weekIndex: 1,
        startTime: "10:00",
        endTime: "18:00",
        breakDuration: 30,
        staffingRole: "Bar",
      },
    });
  }

  await prisma.vacationRequest.createMany({
    data: [
      {
        companyId: company.id,
        userId: max.id,
        startDate: addHours(today, 24 * 10),
        endDate: addHours(today, 24 * 12),
        days: 3,
        reason: "Familienurlaub",
        status: VacationStatus.PENDING,
      },
      {
        companyId: company.id,
        userId: sophie.id,
        startDate: addHours(today, 24 * 20),
        endDate: addHours(today, 24 * 22),
        days: 3,
        reason: "Kurzreise",
        status: VacationStatus.APPROVED,
        approvedById: manager.id,
        approvedAt: new Date(),
      },
      {
        companyId: company.id,
        userId: luca.id,
        startDate: addHours(today, 24 * 5),
        endDate: addHours(today, 24 * 9),
        days: 5,
        reason: "Pruefungsphase",
        status: VacationStatus.REJECTED,
        approvedById: owner.id,
        approvedAt: new Date(),
      },
    ],
  });

  console.log("Seed fertig: VREMA Solutions + Demo-Daten erstellt.");
  console.log("Login Demo: kevin@vrema.solutions / DemoPass!123");
  console.log("Checkliste Bar: max@vrema.solutions (Personalrolle Bar) – nach Einstempeln erscheint „Schlussdienst Bar“.");
}

main()
  .catch((error) => {
    console.error("Seed Fehler:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
