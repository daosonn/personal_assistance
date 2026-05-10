import { expect, test } from "@playwright/test";

test("navigates across the three main planner pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /good morning/i })).toBeVisible();

  await page.getByRole("link", { name: /calendar/i }).click();
  await expect(page.getByRole("heading", { name: /plan the full 24-hour day/i })).toBeVisible();

  await page.getByRole("link", { name: /review/i }).click();
  await expect(page.getByRole("heading", { name: /close the day with evidence/i })).toBeVisible();
});

test("marks a task done from the today dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Quick add a task for today...").fill("E2E planning task");
  await page.getByRole("button", { name: "Add" }).last().click();
  const firstTask = page.getByText("E2E planning task").first();
  await expect(firstTask).toBeVisible();
  await firstTask.locator("xpath=ancestor::div[contains(@class,'rounded-2xl')]").getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("done").first()).toBeVisible();
});

test("creates a calendar event and preserves duration inputs", async ({ page }) => {
  await page.goto("/calendar");
  await page.getByRole("button", { name: /create event/i }).click();
  await page.locator("input").filter({ hasText: "" }).first().fill("E2E focus block");
  await page.getByLabel("Start").fill("23:30");
  await page.getByLabel("End").fill("00:30");
  await page.getByRole("button", { name: /create event/i }).last().click();
  await expect(page.getByText("E2E focus block")).toBeVisible();
});

test("generates a daily summary with a mocked AI response", async ({ page }) => {
  await page.route("**/api/ai/daily-summary", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          overall_summary: "A steady test day.",
          completion_rate: 75,
          focus_minutes: 120,
          mood_guess: "good",
          category_summaries: [],
          completed_tasks: ["Test task"],
          postponed_tasks: [],
          missed_tasks: [],
          what_went_well: ["Clear focus"],
          what_to_improve: ["Add breaks"],
          suggestions_for_tomorrow: ["Start early"]
        },
        provider: "deepseek",
        model: "test"
      })
    });
  });

  await page.goto("/review");
  await page.getByRole("button", { name: /summarize today/i }).click();
  await expect(page.getByText("A steady test day.")).toBeVisible();
});
