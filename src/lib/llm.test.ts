import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { callPlannerLLM } from "./llm";

describe("LLM fallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it("tries Gemini first, then falls back to DeepSeek, then OpenAI", async () => {
    process.env.DEEPSEEK_API_KEY = "deepseek-key";
    process.env.GEMINI_API_KEY = "gemini-key";
    process.env.OPENAI_API_KEY = "openai-key";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "not json" }] } }]
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            choices: [{ message: { content: "{\"ok\":true}" } }]
          })
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await callPlannerLLM({
      system: "system",
      prompt: "prompt",
      schema: z.object({ ok: z.boolean() })
    });

    expect(result.provider).toBe("deepseek");
    expect(result.data.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("generativelanguage.googleapis.com");
    expect(fetchMock.mock.calls[1][0]).toContain("api.deepseek.com");
  });
});
