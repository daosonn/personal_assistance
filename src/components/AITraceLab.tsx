"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Activity, Coins, Cpu, Database, RefreshCw, SearchCode, Zap } from "lucide-react";
import { Button, EmptyState, PageHeader, StatCard, StatusPill } from "./ui";
import type { AITrace, AITraceProvider } from "@/lib/types";
import { getWorkingDayKey } from "@/lib/time";

const ranges = [
  { label: "7 days", value: "7d" },
  { label: "1 month", value: "30d" },
  { label: "3 months", value: "90d" },
  { label: "All time", value: "all" }
] as const;

type RangeValue = (typeof ranges)[number]["value"];

export function AITraceLab() {
  const [traces, setTraces] = useState<AITrace[]>([]);
  const [range, setRange] = useState<RangeValue>("7d");
  const [day, setDay] = useState(getWorkingDayKey());
  const [provider, setProvider] = useState<AITraceProvider | "all">("all");
  const [selectedTraceId, setSelectedTraceId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function loadTraces() {
    setLoading(true);
    const response = await fetch("/api/ai/traces", { cache: "no-store" });
    const data = await response.json();
    setTraces(data.traces ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadTraces();
  }, []);

  const days = useMemo(() => Array.from(new Set(traces.map((trace) => trace.dayKey))).sort().reverse(), [traces]);

  useEffect(() => {
    const today = getWorkingDayKey();
    if (day === today || days.length === 0 || days.includes(day)) return;
    setDay(days.includes(today) ? today : days[0]);
  }, [day, days]);

  const filteredTraces = useMemo(() => {
    const now = new Date();
    const minDate =
      range === "all"
        ? null
        : subDays(now, range === "7d" ? 7 : range === "30d" ? 30 : 90);

    return traces.filter((trace) => {
      const createdAt = new Date(trace.createdAt);
      if (minDate && createdAt < minDate) return false;
      if (trace.dayKey !== day) return false;
      if (provider !== "all" && trace.provider !== provider) return false;
      return true;
    });
  }, [day, provider, range, traces]);

  const selectedTrace = filteredTraces.find((trace) => trace.id === selectedTraceId) ?? filteredTraces[0];

  const totals = useMemo(() => {
    return filteredTraces.reduce(
      (acc, trace) => {
        acc.calls += 1;
        acc.success += trace.status === "success" ? 1 : 0;
        acc.input += trace.usage.inputTokens;
        acc.output += trace.usage.outputTokens;
        acc.cached += trace.usage.cachedInputTokens;
        acc.total += trace.usage.totalTokens;
        acc.cost += trace.cost.totalUsd;
        return acc;
      },
      { calls: 0, success: 0, input: 0, output: 0, cached: 0, total: 0, cost: 0 }
    );
  }, [filteredTraces]);

  const modelRows = useMemo(() => {
    const map = new Map<string, { provider: string; model: string; calls: number; input: number; output: number; cached: number; total: number; cost: number }>();
    for (const trace of filteredTraces) {
      const key = `${trace.provider}:${trace.model}`;
      const row =
        map.get(key) ??
        { provider: trace.provider, model: trace.model, calls: 0, input: 0, output: 0, cached: 0, total: 0, cost: 0 };
      row.calls += 1;
      row.input += trace.usage.inputTokens;
      row.output += trace.usage.outputTokens;
      row.cached += trace.usage.cachedInputTokens;
      row.total += trace.usage.totalTokens;
      row.cost += trace.cost.totalUsd;
      map.set(key, row);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredTraces]);

  const tracesByDay = useMemo(() => {
    return filteredTraces.reduce<Record<string, AITrace[]>>((acc, trace) => {
      acc[trace.dayKey] = [...(acc[trace.dayKey] ?? []), trace];
      return acc;
    }, {});
  }, [filteredTraces]);

  const selectedDayLabel = day === getWorkingDayKey() ? `${day} (Today)` : day;

  return (
    <div>
      <PageHeader
        eyebrow="AI Trace Lab"
        title="Model call traces for learning"
        description="A technical logbook for prompt, payload, raw response, parsed JSON, token usage, cache tokens, latency, provider fallback, and estimated cost."
        actions={
          <>
            <Button variant="secondary" onClick={loadTraces} disabled={loading}>
              <RefreshCw size={17} />
              Refresh
            </Button>
          </>
        }
      />

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Activity} label="Calls" value={`${totals.calls}`} helper={`${totals.success} success`} />
        <StatCard icon={Database} label="Tokens" value={formatNumber(totals.total)} helper={`${formatNumber(totals.input)} in / ${formatNumber(totals.output)} out`} tone="sky" />
        <StatCard icon={Zap} label="Cached input" value={formatNumber(totals.cached)} helper="Provider-reported cache hits" tone="lavender" />
        <StatCard icon={Coins} label="Est. cost" value={formatUsd(totals.cost)} helper="Using your provided pricing" tone="peach" />
      </section>

      <section className="planner-card mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <label>
            <span className="text-sm font-bold text-muted">Range</span>
            <select className="soft-input mt-1 w-full" value={range} onChange={(event) => setRange(event.target.value as RangeValue)}>
              {ranges.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-bold text-muted">Trace day</span>
            <select className="soft-input mt-1 w-full" value={day} onChange={(event) => setDay(event.target.value)}>
              {!days.includes(getWorkingDayKey()) ? <option value={getWorkingDayKey()}>Today - {getWorkingDayKey()}</option> : null}
              {days.map((item) => (
                <option key={item} value={item}>{item === getWorkingDayKey() ? `Today - ${item}` : item}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-bold text-muted">Provider</span>
            <select className="soft-input mt-1 w-full" value={provider} onChange={(event) => setProvider(event.target.value as AITraceProvider | "all")}>
              <option value="all">All providers</option>
              <option value="deepseek">DeepSeek</option>
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>
          <div className="rounded-2xl bg-sage-50 px-4 py-3 text-sm font-bold text-sage-900">
            {filteredTraces.length} trace(s)
          </div>
        </div>
      </section>

      <section className="mb-6 planner-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Cpu size={19} className="text-sage-700" />
          <h2 className="text-xl font-bold text-ink">Token and cost by model</h2>
        </div>
        {modelRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2">Provider</th>
                  <th>Model</th>
                  <th>Calls</th>
                  <th>Input</th>
                  <th>Cached</th>
                  <th>Output</th>
                  <th>Total</th>
                  <th>Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {modelRows.map((row) => (
                  <tr key={`${row.provider}:${row.model}`} className="border-t border-sage-100">
                    <td className="py-3 font-bold text-ink">{row.provider}</td>
                    <td className="font-mono text-xs text-muted">{row.model}</td>
                    <td>{row.calls}</td>
                    <td>{formatNumber(row.input)}</td>
                    <td>{formatNumber(row.cached)}</td>
                    <td>{formatNumber(row.output)}</td>
                    <td>{formatNumber(row.total)}</td>
                    <td>{formatUsd(row.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No token data yet" description="Call AI from the planner or run the internal provider health check to create traces." />
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.2fr]">
        <div className="planner-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <SearchCode size={19} className="text-sage-700" />
            <div>
              <h2 className="text-xl font-bold text-ink">Trace timeline</h2>
              <p className="text-sm text-muted">Showing traces for {selectedDayLabel}</p>
            </div>
          </div>
          {Object.keys(tracesByDay).length ? (
            <div className="space-y-5">
              {Object.entries(tracesByDay).map(([traceDay, items]) => (
                <div key={traceDay}>
                  <p className="mb-2 text-sm font-bold text-muted">{traceDay}</p>
                  <div className="space-y-2">
                    {items.map((trace) => (
                      <button
                        suppressHydrationWarning
                        key={trace.id}
                        onClick={() => setSelectedTraceId(trace.id)}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          selectedTrace?.id === trace.id ? "border-sage-500 bg-sage-50" : "border-sage-100 bg-white/70 hover:bg-sage-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-ink">{trace.operation}</p>
                            <p className="mt-1 font-mono text-xs text-muted">{format(new Date(trace.createdAt), "HH:mm:ss")} - {trace.provider}/{trace.model}</p>
                          </div>
                          <StatusPill className={trace.status === "success" ? "bg-sage-100 text-sage-700" : "bg-peach-100 text-peach-700"}>
                            {trace.status}
                          </StatusPill>
                        </div>
                        <p className="mt-2 text-xs text-muted">
                          {formatNumber(trace.usage.totalTokens)} tokens - {formatUsd(trace.cost.totalUsd)} - {trace.latencyMs}ms
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No traces yet" description="AI calls will be stored here with full prompt, payload, response and usage details." />
          )}
        </div>

        <div className="planner-card p-6">
          <h2 className="text-xl font-bold text-ink">Trace detail</h2>
          {selectedTrace ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <TraceMetric label="Provider" value={selectedTrace.provider} />
                <TraceMetric label="Model" value={selectedTrace.model} />
                <TraceMetric label="Latency" value={`${selectedTrace.latencyMs}ms`} />
                <TraceMetric label="Input" value={formatNumber(selectedTrace.usage.inputTokens)} />
                <TraceMetric label="Output" value={formatNumber(selectedTrace.usage.outputTokens)} />
                <TraceMetric label="Cost" value={formatUsd(selectedTrace.cost.totalUsd)} />
              </div>
              <CodeBlock title="System" value={selectedTrace.system} />
              <CodeBlock title="Prompt" value={selectedTrace.prompt} />
              <CodeBlock title="Request payload" value={selectedTrace.requestPayload} />
              <CodeBlock title="Raw response" value={selectedTrace.rawResponse ?? selectedTrace.error ?? ""} />
              <CodeBlock title="Parsed data / error" value={selectedTrace.parsedData ?? selectedTrace.error ?? ""} />
              <div className="rounded-2xl bg-sage-50 p-4 text-sm text-sage-900">{selectedTrace.cost.pricingNote}</div>
            </div>
          ) : (
            <EmptyState title="Select a trace" description="Trace details appear here." />
          )}
        </div>
      </section>
    </div>
  );
}

function TraceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 break-all font-mono text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function CodeBlock({ title, value }: { title: string; value: unknown }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <details className="rounded-2xl border border-sage-100 bg-white/70 p-4" open={title === "Parsed data / error"}>
      <summary className="cursor-pointer text-sm font-bold text-ink">{title}</summary>
      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-ink p-4 text-xs leading-5 text-white">
        {text}
      </pre>
    </details>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatUsd(value: number) {
  if (value === 0) return "$0.000000";
  return `$${value.toFixed(6)}`;
}
