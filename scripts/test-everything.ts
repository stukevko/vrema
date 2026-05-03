import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { generateVerificationToken } from "../src/lib/actions/auth";
import { inviteEmployeeForCompany } from "../src/lib/actions/team";
import { validatePinAndClock } from "../src/lib/actions/terminal";
import { calculateSaldoForUser } from "../src/lib/time/saldo-for-user";
import { applyCheckoutSessionCompleted } from "../src/lib/actions/billing";

type TestResult = { name: string; ok: boolean; details?: string };

function logResult(result: TestResult) {
  const status = result.ok ? "[PASS]" : "[FAIL]";
  const suffix = result.details ? ` - ${result.details}` : "";
  console.log(`${status} ${result.name}${suffix}`);
}

async function main() {
  const results: TestResult[] = [];

  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("[FATAL] Datenbank nicht erreichbar. Bitte DATABASE_URL pruefen und DB/Migrationen starten.");
    throw error;
  }

  const founderEmail = "founder@test.de";
  const maxEmail = "max.integration@test.de";
  const erikaEmail = "erika.integration@test.de";
  const companySlug = "vrema-test-fabrik-integration";

  // Cleanup old run artifacts
  await db.verificationToken.deleteMany({
    where: { OR: [{ identifier: `verify:${founderEmail}` }, { identifier: `reset:${founderEmail}` }] },
  });
  await db.user.deleteMany({ where: { email: { in: [founderEmail, maxEmail, erikaEmail] } } });
  await db.company.deleteMany({ where: { slug: companySlug } });

  // Phase 1: Auth & Onboarding
  const founderPasswordHash = await bcrypt.hash("Founder!123", 12);
  const founderPinHash = await bcrypt.hash("1111", 12);
  const company = await db.company.create({
    data: {
      name: "Initial Setup Company",
      slug: companySlug,
      plan: "STARTER",
      users: {
        create: {
          name: "Founder User",
          email: founderEmail,
          password: founderPasswordHash,
          terminalPinHash: founderPinHash,
          role: "COMPANY_OWNER",
        },
      },
    },
    include: { users: true },
  });
  const founder = company.users[0];

  const verificationToken = await generateVerificationToken(founderEmail);
  const tokenRow = await db.verificationToken.findUnique({ where: { token: verificationToken.token } });
  results.push({
    name: "Registration Flow",
    ok: Boolean(tokenRow && tokenRow.identifier === `verify:${founderEmail}`),
    details: tokenRow ? "Verification-Token erstellt" : "Verification-Token fehlt",
  });

  await db.user.update({
    where: { id: founder.id },
    data: { emailVerified: new Date() },
  });
  await db.company.update({
    where: { id: company.id },
    data: {
      name: "VREMA Test-Fabrik",
    },
  });

  const onboardedCompany = await db.company.findUnique({ where: { id: company.id } });
  results.push({
    name: "Setup Wizard Simulation",
    ok: onboardedCompany?.name === "VREMA Test-Fabrik",
    details: onboardedCompany?.name,
  });

  // Phase 2: Team & Security
  const maxInvite = await inviteEmployeeForCompany(company.id, {
    name: "Max Mustermann",
    email: maxEmail,
    role: "EMPLOYEE",
    weeklyHours: 40,
  });
  const erikaInvite = await inviteEmployeeForCompany(company.id, {
    name: "Erika Musterfrau",
    email: erikaEmail,
    role: "EMPLOYEE",
    weeklyHours: 40,
  });

  const [maxUser, erikaUser] = await Promise.all([
    db.user.findUnique({ where: { id: maxInvite.user.id } }),
    db.user.findUnique({ where: { id: erikaInvite.user.id } }),
  ]);

  const teamSecure =
    Boolean(maxUser?.terminalPinHash && erikaUser?.terminalPinHash) &&
    maxUser?.companyId === company.id &&
    erikaUser?.companyId === company.id;

  results.push({
    name: "Team Invite Security",
    ok: teamSecure,
    details: teamSecure ? "PIN gehasht + company_id korrekt" : "PIN/Company Pruefung fehlgeschlagen",
  });

  // Phase 3: Terminal (PIN, ohne Standort)
  const erikaClockIn = await validatePinAndClock(companySlug, erikaInvite.terminalPin);
  const maxClockIn = await validatePinAndClock(companySlug, maxInvite.terminalPin);
  const terminalOk = erikaClockIn.status === "success" && maxClockIn.status === "success";
  results.push({
    name: "Terminal PIN Stempeln",
    ok: terminalOk,
    details: terminalOk ? "Beide Einstempeln erfolgreich" : `Erika=${erikaClockIn.status}, Max=${maxClockIn.status}`,
  });

  // Phase 4: Logik & Saldo
  const erikaActiveLog = await db.workLog.findFirst({
    where: { companyId: company.id, userId: erikaInvite.user.id, clockOut: null },
    orderBy: { createdAt: "desc" },
  });
  if (erikaActiveLog) {
    await db.workLog.update({
      where: { id: erikaActiveLog.id },
      data: { clockIn: new Date(Date.now() - 8 * 60 * 60 * 1000) },
    });
  }

  await validatePinAndClock(companySlug, erikaInvite.terminalPin);

  const erikaSaldo = await calculateSaldoForUser(company.id, erikaInvite.user.id);
  const saldoOk = erikaSaldo.workedMinutes === 480;
  results.push({
    name: "Saldo Calculation",
    ok: saldoOk,
    details: `workedMinutes=${erikaSaldo.workedMinutes}`,
  });

  // Phase 5: Billing & Gates
  await applyCheckoutSessionCompleted({
    companyId: company.id,
    plan: "BUSINESS",
    interval: "monthly",
    stripeCustomerId: "cus_test_business",
    stripeSubId: "sub_test_business",
  });

  const billedCompany = await db.company.findUnique({ where: { id: company.id } });
  const pdfUnlocked = billedCompany?.plan === "BUSINESS" || billedCompany?.plan === "ENTERPRISE";
  results.push({
    name: "Billing Upgrade Webhook Simulation",
    ok: Boolean(billedCompany?.plan === "BUSINESS" && pdfUnlocked),
    details: `plan=${billedCompany?.plan}`,
  });

  // Phase 6: Absence type integrity (VACATION vs SICK)
  const sickAbsence = await db.vacationRequest.create({
    data: {
      companyId: company.id,
      userId: erikaInvite.user.id,
      absenceType: "SICK",
      startDate: new Date(),
      endDate: new Date(),
      days: 1,
      status: "APPROVED",
      approvedAt: new Date(),
      reason: "Integrationstest Krank",
    },
  });
  const vacationAbsence = await db.vacationRequest.create({
    data: {
      companyId: company.id,
      userId: maxInvite.user.id,
      absenceType: "VACATION",
      startDate: new Date(),
      endDate: new Date(),
      days: 1,
      status: "APPROVED",
      approvedAt: new Date(),
      reason: "Integrationstest Urlaub",
    },
  });
  const typedAbsences = await db.vacationRequest.findMany({
    where: { id: { in: [sickAbsence.id, vacationAbsence.id] } },
    select: { absenceType: true },
  });
  const hasTypes = typedAbsences.some((a) => a.absenceType === "SICK") && typedAbsences.some((a) => a.absenceType === "VACATION");
  results.push({
    name: "Absence Type Persistence",
    ok: hasTypes,
    details: hasTypes ? "SICK/VACATION gespeichert" : "absenceType fehlt",
  });

  console.log("\n=== VREMA Integration Test Report ===");
  for (const result of results) logResult(result);

  const allPassed = results.every((r) => r.ok);
  console.log(`\nGesamtstatus: ${allPassed ? "ERFOLGREICH" : "FEHLER"}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error("[FATAL] test-everything.ts:", error);
  process.exit(1);
});
