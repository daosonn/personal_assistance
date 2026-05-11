import { promises as fs } from "fs";
import path from "path";
import type { AITrace } from "./types";

const dataDir = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "data");
const tracePath = path.join(dataDir, "ai-traces.json");

async function ensureTraceFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(tracePath);
  } catch {
    await fs.writeFile(tracePath, "[]", "utf8");
  }
}

export async function readAITraces(): Promise<AITrace[]> {
  try {
    await ensureTraceFile();
    const content = await fs.readFile(tracePath, "utf8");
    return JSON.parse(content) as AITrace[];
  } catch (error) {
    console.warn("AI trace read failed; returning an empty trace list.", error);
    return [];
  }
}

export async function appendAITrace(trace: AITrace) {
  try {
    const traces = await readAITraces();
    traces.unshift(trace);
    await fs.writeFile(tracePath, JSON.stringify(traces, null, 2), "utf8");
  } catch (error) {
    console.warn("AI trace write failed; continuing without persisted trace.", error);
  }
}

export async function clearAITraces() {
  try {
    await ensureTraceFile();
    await fs.writeFile(tracePath, "[]", "utf8");
  } catch (error) {
    console.warn("AI trace clear failed.", error);
  }
}
