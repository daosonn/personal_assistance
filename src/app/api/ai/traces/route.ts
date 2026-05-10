import { NextResponse } from "next/server";
import { clearAITraces, readAITraces } from "@/lib/ai-trace-store";

export async function GET() {
  const traces = await readAITraces();
  return NextResponse.json({ traces });
}

export async function DELETE() {
  await clearAITraces();
  return NextResponse.json({ ok: true });
}
