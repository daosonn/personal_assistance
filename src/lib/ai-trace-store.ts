import { promises as fs } from "fs";
import path from "path";
import type { AITrace } from "./types";

const dataDir = path.join(process.cwd(), "data");
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
  await ensureTraceFile();
  const content = await fs.readFile(tracePath, "utf8");
  try {
    return JSON.parse(content) as AITrace[];
  } catch {
    return [];
  }
}

export async function appendAITrace(trace: AITrace) {
  const traces = await readAITraces();
  traces.unshift(trace);
  await fs.writeFile(tracePath, JSON.stringify(traces, null, 2), "utf8");
}

export async function clearAITraces() {
  await ensureTraceFile();
  await fs.writeFile(tracePath, "[]", "utf8");
}
