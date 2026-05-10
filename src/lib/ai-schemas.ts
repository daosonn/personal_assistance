import { z } from "zod";

export const CategorySummarySchema = z.object({
  category: z.string(),
  total_minutes: z.number(),
  completed_items: z.array(z.string()),
  insight: z.string(),
  suggestion: z.string()
});

export const DailySummarySchema = z.object({
  overall_summary: z.string(),
  completion_rate: z.number(),
  focus_minutes: z.number(),
  mood_guess: z.enum(["great", "good", "normal", "tired", "bad"]),
  category_summaries: z.array(CategorySummarySchema),
  completed_tasks: z.array(z.string()),
  postponed_tasks: z.array(z.string()),
  missed_tasks: z.array(z.string()),
  what_went_well: z.array(z.string()),
  what_to_improve: z.array(z.string()),
  suggestions_for_tomorrow: z.array(z.string())
});

export const MorningPlanSchema = z.object({
  date: z.string(),
  summary: z.string(),
  fixed_blocks: z.array(
    z.object({
      event_id: z.string(),
      title: z.string(),
      start_time: z.string(),
      end_time: z.string(),
      reason: z.string()
    })
  ),
  planned_items: z.array(
    z.object({
      task_id: z.string(),
      title: z.string(),
      start_time: z.string(),
      end_time: z.string(),
      category: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      reason: z.string()
    })
  ),
  breaks: z.array(
    z.object({
      start_time: z.string(),
      end_time: z.string(),
      reason: z.string()
    })
  ),
  unscheduled: z.array(
    z.object({
      task_id: z.string(),
      title: z.string(),
      reason: z.string()
    })
  ),
  warnings: z.array(z.string()),
  suggestions: z.array(z.string())
});

export type DailySummaryResponse = z.infer<typeof DailySummarySchema>;
export type MorningPlanResponse = z.infer<typeof MorningPlanSchema>;
