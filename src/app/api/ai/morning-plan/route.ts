import { NextResponse } from "next/server";
import { MorningPlanSchema } from "@/lib/ai-schemas";
import { callPlannerLLM } from "@/lib/llm";
import { morningPlanPrompt, plannerSystemPrompt } from "@/lib/prompts";
import type { PlannerStateSnapshot } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      date: string;
      snapshot: PlannerStateSnapshot;
      currentDateTime?: string;
      currentLocalTime?: string;
      timezone?: string;
      isCurrentWorkingDay?: boolean;
      adjustmentPrompt?: string;
    };
    const result = await callPlannerLLM({
      system: plannerSystemPrompt,
      prompt: morningPlanPrompt(body.snapshot, body.date, {
        currentDateTime: body.currentDateTime,
        currentLocalTime: body.currentLocalTime,
        timezone: body.timezone,
        isCurrentWorkingDay: body.isCurrentWorkingDay,
        adjustmentPrompt: body.adjustmentPrompt
      }),
      schema: MorningPlanSchema,
      operation: "morning_plan"
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("morning_plan failed", error);
    return NextResponse.json(
      {
        message:
          "I could not build a new plan right now. Fixed events and existing tasks were not changed.",
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
