import { NextResponse } from "next/server";
import { DailySummarySchema } from "@/lib/ai-schemas";
import { callPlannerLLM } from "@/lib/llm";
import { dailySummaryPrompt, plannerSystemPrompt } from "@/lib/prompts";
import type { PlannerStateSnapshot } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { date: string; snapshot: PlannerStateSnapshot };
    const result = await callPlannerLLM({
      system: plannerSystemPrompt,
      prompt: dailySummaryPrompt(body.snapshot, body.date),
      schema: DailySummarySchema,
      operation: "daily_summary"
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("daily_summary failed", error);
    return NextResponse.json(
      {
        message:
          "I could not generate the daily summary right now. Your planner data is safe; please try again in a moment.",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
