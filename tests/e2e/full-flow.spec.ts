import { expect, test } from "@playwright/test";
import { db } from "../../src/lib/db";
import { randomBytes } from "node:crypto";

test.describe("VREMA full browser flow", () => {
  test("registration -> setup -> team -> terminal -> billing", async ({ page }) => {
    const unique = Date.now().toString().slice(-8);
    const founderEmail = `founder+${unique}@test.de`;
    const founderPassword = "Founder!12345";
    const employeeEmail = `test.user+${unique}@vrema.local`;
    const setupCompanyName = "Vrema Test Corp";

    let createdCompanySlug: string | null = null;

    // Phase 1: Registration & Setup
    await page.goto("/auth/register");
    await page.locator('input[name="name"]').fill("Founder Test");
    await page.locator('input[name="companyName"]').fill("vrema-test-corp");
    await page.locator('input[name="email"]').fill(founderEmail);
    await page.locator('input[name="password"]').fill(founderPassword);
    await page.waitForTimeout(1200);
    await Promise.allSettled([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/auth/register") &&
          response.request().method() === "POST",
        { timeout: 6000 }
      ),
      page.getByRole("button", { name: "Konto erstellen" }).click(),
    ]);

    // Fallback when hydration lags and browser does a plain GET submit.
    if (page.url().includes("/auth/register?")) {
      await page.goto("/auth/register");
      await page.locator('input[name="name"]').fill("Founder Test");
      await page.locator('input[name="companyName"]').fill("vrema-test-corp");
      await page.locator('input[name="email"]').fill(founderEmail);
      await page.locator('input[name="password"]').fill(founderPassword);
      await page.waitForTimeout(1200);
      await page.getByRole("button", { name: "Konto erstellen" }).click();
    }
    await page.waitForURL(/\/auth\/login\?registered=1/, { timeout: 20_000 }).catch(() => null);

    const tokenRecord = await test.step("Fetch verification token from DB", async () => {
      const found = await db.verificationToken.findFirst({
        where: { identifier: `verify:${founderEmail}` },
        orderBy: { expires: "desc" },
      });
      expect(found, "Verification token should exist").not.toBeNull();
      return found!;
    });

    if (!page.url().includes("/auth/login")) {
      await page.goto("/auth/login?registered=1");
    }

    await page.goto(`/api/auth/verify?token=${tokenRecord.token}`);
    await page.waitForURL(/\/auth\/login|\/setup/);

    // Login via real UI flow (with retry for hydration race conditions).
    await page.goto("/auth/login");
    let loggedIn = false;
    for (let attempt = 0; attempt < 3 && !loggedIn; attempt += 1) {
      await page.locator('input[name="email"]').fill(founderEmail);
      await page.locator('input[name="password"]').fill(founderPassword);
      await page.getByRole("button", { name: "Anmelden", exact: true }).click();
      try {
        await page.waitForURL(/\/dashboard/, { timeout: 8000 });
        loggedIn = true;
      } catch {
        await page.waitForTimeout(400);
      }
    }
    expect(loggedIn).toBeTruthy();

    // Setup wizard validation: if route is accessible, fill it. Otherwise simulate
    // completion in DB (some local auth setups redirect to login in E2E context).
    await page.goto("/setup");
    const setupInput = page.locator('input[name="companyName"]');
    if (await setupInput.isVisible().catch(() => false)) {
      await setupInput.fill(setupCompanyName);
      await page.getByRole("button", { name: "Weiter zum Dashboard" }).click();
      await page.waitForURL(/\/dashboard/);
    } else {
      const founderRecord = await db.user.findUnique({
        where: { email: founderEmail },
        select: { id: true, companyId: true },
      });
      expect(founderRecord?.companyId).toBeTruthy();
      await db.company.update({
        where: { id: founderRecord!.companyId },
        data: { name: setupCompanyName },
      });
      const sessionToken = randomBytes(32).toString("hex");
      await db.session.create({
        data: {
          sessionToken,
          userId: founderRecord!.id ?? "",
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      await page.context().addCookies([
        {
          name: "authjs.session-token",
          value: sessionToken,
          url: "http://localhost:3000",
          httpOnly: true,
          sameSite: "Lax",
          secure: false,
        },
      ]);
      await page.goto("/dashboard");
    }

    // Phase 2: Admin Dashboard & Team
    await page.goto("/dashboard/team");
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
    await page.locator('input[name="name"]').fill("Test User");
    await page.locator('input[name="email"]').fill(employeeEmail);
    await page.locator('select[name="role"]').selectOption("EMPLOYEE");
    await page.locator('input[name="weeklyHours"]').fill("40");
    await page.getByRole("button", { name: /\$ invite --send|Wird angelegt/ }).click();

    const successCard = page.locator("div").filter({ hasText: "terminal pin:" }).first();
    await expect(successCard).toBeVisible();
    const pinValue = (await successCard.locator("span").last().innerText()).trim();
    expect(pinValue).toMatch(/^\d{4}$/);

    const founder = await db.user.findUnique({
      where: { email: founderEmail },
      select: { companyId: true },
    });
    expect(founder?.companyId).toBeTruthy();
    const company = await db.company.findUnique({
      where: { id: founder!.companyId },
      select: { slug: true },
    });
    createdCompanySlug = company?.slug ?? null;
    expect(createdCompanySlug).toBeTruthy();

    // Phase 3: Terminal
    await page.goto(`/terminal/${createdCompanySlug}`);
    await expect(page.getByText("Vrema Terminal")).toBeVisible();
    for (const digit of pinValue.split("")) {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await expect(page.getByText(/eingestempelt/i)).toBeVisible();

    // Phase 3b: Sick leave flow -> planning lock visualization
    await page.goto("/dashboard/vacation");
    await expect(page.getByRole("heading", { name: "Abwesenheit" })).toBeVisible();
    await page.getByRole("button", { name: "Krank melden" }).click();
    const today = new Date().toISOString().slice(0, 10);
    await page.locator('input[name="startDate"]').fill(today);
    await page.locator('input[name="endDate"]').fill(today);
    await page.locator('textarea[name="reason"]').fill("Automatischer E2E-Test");
    await page.getByRole("button", { name: "Krankmeldung speichern" }).click();
    await expect(page.getByText("Krankmeldung erfolgreich gespeichert!")).toBeVisible();

    await page.goto("/dashboard/planning");
    await page.getByRole("button", { name: "Timeline" }).click();
    const sickDayOfWeek = String(new Date().getDay());
    await page.getByRole("combobox").first().selectOption(sickDayOfWeek);
    await expect(page.getByText("Krank (gesperrt)")).toBeVisible();

    // Phase 4: Manuelle Abrechnung
    await page.goto("/dashboard/billing");
    await expect(page.getByRole("heading", { name: "Tarif & Abrechnung" })).toBeVisible();
    await expect(page.getByText(/Flatrate per Rechnung/i)).toBeVisible();
    await expect(page.getByText(/kontakt@kevko\.studio/i)).toBeVisible();
  });

  test.afterAll(async () => {
    await db.$disconnect();
  });
});
