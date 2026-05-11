import { z } from "zod";
import { estimateCost, emptyUsage } from "./ai-pricing";
import { appendAITrace } from "./ai-trace-store";
import { getWorkingDayKey } from "./time";
import type { AITrace, AITraceProvider, AITraceUsage } from "./types";

type Provider = AITraceProvider;

interface LLMRequest<T> {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
  operation?: string;
}

export interface LLMResult<T> {
  data: T;
  provider: Provider;
  model: string;
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("The model did not return JSON.");
  return match[0];
}

function parseWithSchema<T>(text: string, schema: z.ZodType<T>) {
  return schema.parse(JSON.parse(extractJson(text)));
}

async function writeTrace(trace: Omit<AITrace, "id" | "createdAt" | "dayKey" | "cost">) {
  if (process.env.NODE_ENV === "test") return;
  const createdAt = new Date().toISOString();
  const fullTrace: AITrace = {
    ...trace,
    id: crypto.randomUUID(),
    createdAt,
    dayKey: getWorkingDayKey(new Date(createdAt)),
    cost: estimateCost(trace.provider, trace.usage)
  };
  try {
    await appendAITrace(fullTrace);
  } catch (error) {
    console.warn("AI trace persistence failed; continuing with model result.", error);
  }
}

async function readResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function deepSeekUsage(json: any): AITraceUsage {
  const usage = json?.usage ?? {};
  const inputTokens = usage.prompt_tokens ?? 0;
  const outputTokens = usage.completion_tokens ?? 0;
  const cachedInputTokens = usage.prompt_cache_hit_tokens ?? 0;
  const cacheMissInputTokens = usage.prompt_cache_miss_tokens ?? Math.max(0, inputTokens - cachedInputTokens);
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage.total_tokens ?? inputTokens + outputTokens,
    cachedInputTokens,
    cacheMissInputTokens
  };
}

function geminiUsage(json: any): AITraceUsage {
  const usage = json?.usageMetadata ?? {};
  const inputTokens = usage.promptTokenCount ?? 0;
  const outputTokens = usage.candidatesTokenCount ?? 0;
  const cachedInputTokens = usage.cachedContentTokenCount ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage.totalTokenCount ?? inputTokens + outputTokens,
    cachedInputTokens,
    cacheMissInputTokens: Math.max(0, inputTokens - cachedInputTokens)
  };
}

function openAIUsage(json: any): AITraceUsage {
  const usage = json?.usage ?? {};
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cachedInputTokens = usage.input_tokens_details?.cached_tokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage.total_tokens ?? inputTokens + outputTokens,
    cachedInputTokens,
    cacheMissInputTokens: Math.max(0, inputTokens - cachedInputTokens)
  };
}

async function callDeepSeek<T>(request: LLMRequest<T>) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured.");
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  const startedAt = performance.now();
  const requestPayload = {
    model,
    temperature: request.temperature ?? 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: request.system },
      { role: "user", content: request.prompt }
    ]
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestPayload)
  });

  const json = await readResponse(response);
  const usage = typeof json === "object" ? deepSeekUsage(json) : emptyUsage();
  const latencyMs = Math.round(performance.now() - startedAt);
  try {
    if (!response.ok) throw new Error(`DeepSeek failed with ${response.status}: ${JSON.stringify(json)}`);
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek returned an empty response.");
    const data = parseWithSchema(content, request.schema);
    await writeTrace({
      operation: request.operation ?? "planner_llm",
      provider: "deepseek",
      model,
      status: "success",
      latencyMs,
      system: request.system,
      prompt: request.prompt,
      requestPayload,
      rawResponse: json,
      parsedData: data,
      usage
    });
    return { data, provider: "deepseek" as const, model };
  } catch (error) {
    await writeTrace({
      operation: request.operation ?? "planner_llm",
      provider: "deepseek",
      model,
      status: "error",
      latencyMs,
      system: request.system,
      prompt: request.prompt,
      requestPayload,
      rawResponse: json,
      error: error instanceof Error ? error.message : String(error),
      usage
    });
    throw error;
  }
}

async function callGemini<T>(request: LLMRequest<T>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const startedAt = performance.now();
  const requestPayload = {
    generationConfig: {
      temperature: request.temperature ?? 0.2,
      responseMimeType: "application/json"
    },
    contents: [
      {
        role: "user",
        parts: [{ text: `${request.system}\n\n${request.prompt}` }]
      }
    ]
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload)
    }
  );

  const json = await readResponse(response);
  const usage = typeof json === "object" ? geminiUsage(json) : emptyUsage();
  const latencyMs = Math.round(performance.now() - startedAt);
  try {
    if (!response.ok) throw new Error(`Gemini failed with ${response.status}: ${JSON.stringify(json)}`);
    const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error("Gemini returned an empty response.");
    const data = parseWithSchema(content, request.schema);
    await writeTrace({
      operation: request.operation ?? "planner_llm",
      provider: "gemini",
      model,
      status: "success",
      latencyMs,
      system: request.system,
      prompt: request.prompt,
      requestPayload,
      rawResponse: json,
      parsedData: data,
      usage
    });
    return { data, provider: "gemini" as const, model };
  } catch (error) {
    await writeTrace({
      operation: request.operation ?? "planner_llm",
      provider: "gemini",
      model,
      status: "error",
      latencyMs,
      system: request.system,
      prompt: request.prompt,
      requestPayload,
      rawResponse: json,
      error: error instanceof Error ? error.message : String(error),
      usage
    });
    throw error;
  }
}

async function callOpenAI<T>(request: LLMRequest<T>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const startedAt = performance.now();
  const requestPayload = {
    model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: request.system }]
      },
      {
        role: "user",
        content: [{ type: "input_text", text: request.prompt }]
      }
    ],
    text: { format: { type: "json_object" } }
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestPayload)
  });

  const json = await readResponse(response);
  const usage = typeof json === "object" ? openAIUsage(json) : emptyUsage();
  const latencyMs = Math.round(performance.now() - startedAt);
  try {
    if (!response.ok) throw new Error(`OpenAI failed with ${response.status}: ${JSON.stringify(json)}`);
    const content =
      json.output_text ??
      json.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
        ?.map((part: { text?: string }) => part.text)
        ?.filter(Boolean)
        ?.join("\n");
    if (!content) throw new Error("OpenAI returned an empty response.");
    const data = parseWithSchema(content, request.schema);
    await writeTrace({
      operation: request.operation ?? "planner_llm",
      provider: "openai",
      model,
      status: "success",
      latencyMs,
      system: request.system,
      prompt: request.prompt,
      requestPayload,
      rawResponse: json,
      parsedData: data,
      usage
    });
    return { data, provider: "openai" as const, model };
  } catch (error) {
    await writeTrace({
      operation: request.operation ?? "planner_llm",
      provider: "openai",
      model,
      status: "error",
      latencyMs,
      system: request.system,
      prompt: request.prompt,
      requestPayload,
      rawResponse: json,
      error: error instanceof Error ? error.message : String(error),
      usage
    });
    throw error;
  }
}

export async function callPlannerProvider<T>(
  provider: Provider,
  request: LLMRequest<T>
): Promise<LLMResult<T>> {
  if (provider === "deepseek") return callDeepSeek(request);
  if (provider === "gemini") return callGemini(request);
  return callOpenAI(request);
}

export async function callPlannerLLM<T>(request: LLMRequest<T>): Promise<LLMResult<T>> {
  const errors: string[] = [];
  for (const call of [callGemini<T>, callDeepSeek<T>, callOpenAI<T>]) {
    try {
      return await call(request);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`All LLM providers failed: ${errors.join(" | ")}`);
}

export const testExports = { extractJson, parseWithSchema };
