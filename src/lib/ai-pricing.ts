import type { AITraceCost, AITraceProvider, AITraceUsage } from "./types";

type Pricing = {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheHitInputPerMillion: number;
  cacheMissInputPerMillion?: number;
  note: string;
};

export const aiPricing: Record<AITraceProvider, Pricing> = {
  deepseek: {
    inputPerMillion: 0.435,
    outputPerMillion: 0.87,
    cacheHitInputPerMillion: 0.003625,
    cacheMissInputPerMillion: 0.435,
    note:
      "DeepSeek-V4-Pro discounted estimate from user-provided pricing: cache miss $0.435/1M, cache hit $0.003625/1M, output $0.87/1M."
  },
  openai: {
    inputPerMillion: 0.15,
    outputPerMillion: 0.6,
    cacheHitInputPerMillion: 0.075,
    note:
      "GPT-4o mini estimate from user-provided pricing: input $0.15/1M, cached input $0.075/1M, output $0.60/1M."
  },
  gemini: {
    inputPerMillion: 0,
    outputPerMillion: 0,
    cacheHitInputPerMillion: 0,
    note: "Gemini is treated as $0 because this project is currently using the free tier."
  }
};

export function estimateCost(provider: AITraceProvider, usage: AITraceUsage): AITraceCost {
  const pricing = aiPricing[provider];
  const cacheMissInputTokens =
    usage.cacheMissInputTokens || Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  const cacheHitUsd = (usage.cachedInputTokens / 1_000_000) * pricing.cacheHitInputPerMillion;
  const cacheMissUsd =
    (cacheMissInputTokens / 1_000_000) * (pricing.cacheMissInputPerMillion ?? pricing.inputPerMillion);
  const inputUsd = cacheHitUsd + cacheMissUsd;
  const outputUsd = (usage.outputTokens / 1_000_000) * pricing.outputPerMillion;

  return {
    inputUsd,
    outputUsd,
    cacheHitUsd,
    cacheMissUsd,
    totalUsd: inputUsd + outputUsd,
    pricingNote: pricing.note
  };
}

export function emptyUsage(): AITraceUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
    cacheMissInputTokens: 0
  };
}
