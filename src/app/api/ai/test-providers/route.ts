import { NextResponse } from "next/server";
import { z } from "zod";
import { callPlannerProvider } from "@/lib/llm";
import type { AITraceProvider } from "@/lib/types";

const TestSchema = z.object({
  ok: z.boolean(),
  provider: z.string(),
  message: z.string()
});

const providers: AITraceProvider[] = ["deepseek", "gemini", "openai"];

export async function POST() {
  const results = [];

  for (const provider of providers) {
    try {
      const result = await callPlannerProvider(provider, {
        operation: "provider_health_check",
        system: "You are an API health-check assistant. Return strict JSON only.",
        prompt: `Return exactly this JSON shape for provider ${provider}: {"ok":true,"provider":"${provider}","message":"connected"}`,
        schema: TestSchema,
        temperature: 0
      });

      results.push({
        provider,
        ok: true,
        model: result.model,
        data: result.data
      });
    } catch (error) {
      results.push({
        provider,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return NextResponse.json({ results });
}
