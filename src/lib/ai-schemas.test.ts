import { describe, expect, it } from "vitest";
import { DailySummarySchema, MorningPlanSchema } from "./ai-schemas";

describe("AI schemas", () => {
  it("validates daily summary response", () => {
    const parsed = DailySummarySchema.parse({
      overall_summary: "A steady day.",
      completion_rate: 80,
      focus_minutes: 180,
      mood_guess: "good",
      category_summaries: [],
      completed_tasks: ["Review"],
      postponed_tasks: [],
      missed_tasks: [],
      what_went_well: ["Started early"],
      what_to_improve: ["Shorter evening plan"],
      suggestions_for_tomorrow: ["Plan one deep block"]
    });
    expect(parsed.mood_guess).toBe("good");
  });

  it("validates morning plan response", () => {
    const parsed = MorningPlanSchema.parse({
      date: "2026-05-09",
      summary: "Protect fixed class and plan focus blocks.",
      fixed_blocks: [],
      planned_items: [],
      breaks: [],
      unscheduled: [],
      warnings: [],
      suggestions: []
    });
    expect(parsed.date).toBe("2026-05-09");
  });
});
