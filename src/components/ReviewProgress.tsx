"use client";

import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Brain, CalendarDays, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button, EmptyState, PageHeader, StatCard, StatusPill } from "./ui";
import { makeTomorrowTask, usePlannerStore } from "@/lib/store";
import type { CategorySummary, DailyReview } from "@/lib/types";
import { getNextWorkingDayKey, getPreviousWorkingDayKey, getWorkingDayKey, getWorkingDayKeyFromParts } from "@/lib/time";

const chartRanges = [
  { label: "7 days", days: 7 },
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 }
] as const;

export function ReviewProgress() {
  const { reviews, tasks, events, addTask, deleteTask, upsertReview, snapshot } = usePlannerStore();
  const [selectedDate, setSelectedDate] = useState(getWorkingDayKey());
  const [chartRangeDays, setChartRangeDays] = useState<(typeof chartRanges)[number]["days"]>(7);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState("");
  const [tomorrowTitle, setTomorrowTitle] = useState("");
  const [tomorrowDurationMinutes, setTomorrowDurationMinutes] = useState(45);
  const [tomorrowPreferredTime, setTomorrowPreferredTime] = useState("");
  const [feedback, setFeedback] = useState({
    notes: "",
    wentWell: "",
    improve: "",
    deferredReason: "",
    bestFocusWindow: "09:00-11:30",
    aiPlanningNote: ""
  });
  const [mood, setMood] = useState<DailyReview["mood"]>("good");
  const [energyLevel, setEnergyLevel] = useState(75);

  const selectedReview = reviews.find((review) => review.date === selectedDate);
  const tomorrowDate = getNextWorkingDayKey();
  const tomorrowQueue = tasks
    .filter((task) => task.preferredDate === tomorrowDate && !["done", "cancelled"].includes(task.status))
    .sort((a, b) => (a.preferredTime ?? "99:99").localeCompare(b.preferredTime ?? "99:99"));
  const todayTasks = tasks.filter((task) => task.preferredDate === selectedDate);
  const completedTasks = todayTasks.filter((task) => task.status === "done");
  const postponedTasks = todayTasks.filter((task) => task.status === "postponed");
  const missedTasks = todayTasks.filter((task) => task.status === "missed");
  const focusMinutes = events
    .filter((event) => getWorkingDayKeyFromParts(event.date, event.startTime) === selectedDate && ["focus", "task"].includes(event.type))
    .reduce((sum, event) => sum + event.durationMinutes, 0);
  const completionRate = todayTasks.length ? Math.round((completedTasks.length / todayTasks.length) * 100) : selectedReview?.completionRate ?? 0;

  const chartData = useMemo(() => {
    return Array.from({ length: chartRangeDays }).map((_, index) => {
      const base = new Date(`${getWorkingDayKey()}T12:00:00`);
      const date = format(subDays(base, chartRangeDays - 1 - index), "yyyy-MM-dd");
      const review = reviews.find((item) => item.date === date);
      const dayTasks = tasks.filter((task) => task.preferredDate === date);
      const dayDone = dayTasks.filter((task) => task.status === "done").length;
      const dayFocusMinutes = events
        .filter((event) => getWorkingDayKeyFromParts(event.date, event.startTime) === date && ["focus", "task"].includes(event.type))
        .reduce((sum, event) => sum + event.durationMinutes, 0);
      return {
        date,
        label: chartRangeDays > 30 ? format(new Date(`${date}T12:00:00`), "MMM d") : format(new Date(`${date}T12:00:00`), "MMM d"),
        completion: review?.completionRate ?? (dayTasks.length ? Math.round((dayDone / dayTasks.length) * 100) : 0),
        focus: Math.round(((review?.focusMinutes ?? dayFocusMinutes) / 60) * 10) / 10,
        productivity: review?.productivityScore ?? 0
      };
    });
  }, [chartRangeDays, events, reviews, tasks]);

  const heatmap = useMemo(() => {
    return Array.from({ length: chartRangeDays }).map((_, index) => {
      const base = new Date(`${getWorkingDayKey()}T12:00:00`);
      const date = format(subDays(base, chartRangeDays - 1 - index), "yyyy-MM-dd");
      const review = reviews.find((item) => item.date === date);
      const eventFocusMinutes = events
        .filter((event) => getWorkingDayKeyFromParts(event.date, event.startTime) === date && ["focus", "task"].includes(event.type))
        .reduce((sum, event) => sum + event.durationMinutes, 0);
      const activity = review?.focusMinutes ?? eventFocusMinutes;
      return { date, level: activity > 180 ? 4 : activity > 120 ? 3 : activity > 60 ? 2 : activity > 0 ? 1 : 0 };
    });
  }, [chartRangeDays, events, reviews]);

  async function summarizeToday() {
    setIsSummarizing(true);
    setError("");
    try {
      const response = await fetch("/api/ai/daily-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, snapshot: snapshot() })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Daily summary failed.");
      const data = result.data;
      const review: DailyReview = {
        id: `review-${selectedDate}-${Date.now()}`,
        date: selectedDate,
        mood: data.mood_guess,
        energyLevel,
        completionRate: data.completion_rate,
        focusMinutes: data.focus_minutes,
        learningScore: Math.min(100, Math.round(data.completion_rate * 0.75 + 15)),
        productivityScore: Math.min(100, Math.round(data.completion_rate * 0.8 + 12)),
        aiSummary: data.overall_summary,
        categorySummaries: data.category_summaries.map((item: { category: string; total_minutes: number; completed_items: string[]; insight: string; suggestion: string }) => ({
          category: item.category,
          totalMinutes: item.total_minutes,
          completedItems: item.completed_items,
          insight: item.insight,
          suggestion: item.suggestion
        })),
        completedTasks: data.completed_tasks,
        postponedTasks: data.postponed_tasks,
        missedTasks: data.missed_tasks,
        userFeedback: feedback,
        tomorrowTasks: []
      };
      upsertReview(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Daily summary failed.");
    } finally {
      setIsSummarizing(false);
    }
  }

  function saveManualReflection() {
    const review: DailyReview = {
      id: selectedReview?.id ?? `review-${selectedDate}-${Date.now()}`,
      date: selectedDate,
      mood,
      energyLevel,
      completionRate,
      focusMinutes,
      learningScore: selectedReview?.learningScore ?? completionRate,
      productivityScore: selectedReview?.productivityScore ?? completionRate,
      aiSummary: selectedReview?.aiSummary ?? "Manual reflection saved. Generate an AI summary when you are ready.",
      categorySummaries: selectedReview?.categorySummaries ?? [],
      completedTasks: completedTasks.map((task) => task.title),
      postponedTasks: postponedTasks.map((task) => task.title),
      missedTasks: missedTasks.map((task) => task.title),
      userFeedback: feedback,
      tomorrowTasks: selectedReview?.tomorrowTasks ?? []
    };
    upsertReview(review);
  }

  function addTomorrowTask() {
    if (!tomorrowTitle.trim()) return;
    addTask(
      makeTomorrowTask(tomorrowTitle.trim(), {
        estimatedMinutes: tomorrowDurationMinutes,
        preferredTime: tomorrowPreferredTime
      })
    );
    setTomorrowTitle("");
    setTomorrowPreferredTime("");
  }

  function removeTomorrowTask(id: string, title: string) {
    if (window.confirm(`Delete "${title}" from the ${tomorrowDate} queue?`)) {
      deleteTask(id);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Review & Progress"
        title="Close the day with evidence"
        description="Summarize tasks, capture feedback, and send useful context into tomorrow's 05:00 planning cycle."
        actions={
          <>
            <input
              className="soft-input"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            <Button onClick={summarizeToday} disabled={isSummarizing}>
              <Sparkles size={17} />
              {isSummarizing ? "Summarizing..." : "Summarize Today"}
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { label: "Today", value: getWorkingDayKey() },
          { label: "Yesterday", value: getPreviousWorkingDayKey() },
          { label: "Tomorrow", value: getNextWorkingDayKey() }
        ].map((item) => (
          <Button key={item.label} variant={selectedDate === item.value ? "primary" : "secondary"} onClick={() => setSelectedDate(item.value)}>
            {item.label}
          </Button>
        ))}
      </div>

      {error ? <div className="mb-6 rounded-2xl bg-peach-50 p-4 text-sm font-semibold text-peach-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BarChart3} label="Completion" value={`${selectedReview?.completionRate ?? completionRate}%`} helper="Tasks completed" />
        <StatCard icon={CalendarDays} label="Focus" value={`${Math.round((selectedReview?.focusMinutes ?? focusMinutes) / 60 * 10) / 10}h`} helper="Focus/task blocks" tone="sky" />
        <StatCard icon={Brain} label="Learning" value={`${selectedReview?.learningScore ?? 0}`} helper="Learning score" tone="lavender" />
        <StatCard icon={Sparkles} label="Mood" value={selectedReview?.mood ?? "-"} helper={selectedReview ? `Energy ${selectedReview.energyLevel}%` : "No review yet"} tone="peach" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="space-y-6">
          <div className="planner-card p-6">
            <h2 className="text-xl font-bold text-ink">Feedback</h2>
            <div className="mt-4 grid gap-4">
              <label>
                <span className="text-sm font-bold text-muted">Mood</span>
                <select className="soft-input mt-1 w-full" value={mood} onChange={(event) => setMood(event.target.value as DailyReview["mood"])}>
                  <option>great</option>
                  <option>good</option>
                  <option>normal</option>
                  <option>tired</option>
                  <option>bad</option>
                </select>
              </label>
              <label>
                <span className="text-sm font-bold text-muted">Energy level: {energyLevel}%</span>
                <input className="mt-2 w-full accent-sage-700" type="range" min={0} max={100} value={energyLevel} onChange={(event) => setEnergyLevel(Number(event.target.value))} />
              </label>
              {[
                ["notes", "Notes"],
                ["wentWell", "What went well"],
                ["improve", "What did not work"],
                ["deferredReason", "Deferred task reasons"],
                ["bestFocusWindow", "Best focus window"],
                ["aiPlanningNote", "Planning note for AI"]
              ].map(([key, label]) => (
                <label key={key}>
                  <span className="text-sm font-bold text-muted">{label}</span>
                  <textarea
                    className="soft-input mt-1 min-h-20 w-full"
                    value={feedback[key as keyof typeof feedback]}
                    onChange={(event) => setFeedback({ ...feedback, [key]: event.target.value })}
                  />
                </label>
              ))}
              <Button onClick={saveManualReflection}>Save reflection</Button>
            </div>
          </div>

          <div className="planner-card p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-xl font-bold text-ink">Tomorrow task queue</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  These tasks are queued for the 05:00 planner on {tomorrowDate}, together with fixed calendar blocks.
                </p>
              </div>
              <StatusPill className="shrink-0 bg-sage-100 text-sage-700">{tomorrowDate}</StatusPill>
            </div>

            <div className="mt-5 rounded-2xl border border-sage-100 bg-white/70 p-4">
              <label>
                <span className="text-sm font-bold text-muted">Task title</span>
                <textarea
                  className="soft-input mt-2 min-h-24 w-full resize-y text-base"
                  value={tomorrowTitle}
                  onChange={(event) => setTomorrowTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") addTomorrowTask();
                  }}
                  placeholder={`Add a task for ${tomorrowDate}...`}
                />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-[150px_170px_auto] sm:items-end">
                <label>
                  <span className="text-sm font-bold text-muted">Duration</span>
                  <input
                    className="soft-input mt-2 w-full"
                    min={5}
                    step={5}
                    type="number"
                    value={tomorrowDurationMinutes}
                    onChange={(event) => setTomorrowDurationMinutes(Math.max(5, Number(event.target.value) || 5))}
                    aria-label="Duration"
                  />
                </label>
                <label>
                  <span className="text-sm font-bold text-muted">Preferred time</span>
                  <input
                    className="soft-input mt-2 w-full"
                    type="time"
                    value={tomorrowPreferredTime}
                    onChange={(event) => setTomorrowPreferredTime(event.target.value)}
                    aria-label="Preferred time"
                  />
                </label>
                <Button className="h-11" onClick={addTomorrowTask} disabled={!tomorrowTitle.trim()}>
                  <Plus size={17} />
                  Add to {tomorrowDate}
                </Button>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-ink">Queued for {tomorrowDate}</p>
                <StatusPill className="bg-lavender-100 text-lavender-700">{tomorrowQueue.length} task(s)</StatusPill>
              </div>
              <div className="space-y-2">
                {tomorrowQueue.length ? (
                  tomorrowQueue.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-sage-100 bg-white/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-ink">{task.title}</p>
                          <p className="mt-1 text-xs text-muted">
                            {task.preferredTime ? `Preferred ${task.preferredTime}` : "No preferred time"} - {task.category}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusPill className="bg-sage-100 text-sage-700">{task.estimatedMinutes}m</StatusPill>
                          <button
                            aria-label={`Delete ${task.title}`}
                            title="Delete task"
                            onClick={() => removeTomorrowTask(task.id, task.title)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-peach-50 text-peach-700 transition hover:bg-peach-100 focus:outline-none focus:ring-2 focus:ring-peach-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title={`No tasks queued for ${tomorrowDate}`}
                    description="Add tasks here before sleep; the next 05:00 planning run will use them."
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="planner-card p-6">
            <h2 className="text-xl font-bold text-ink">AI daily summary</h2>
            {selectedReview ? (
              <div className="mt-4">
                <p className="text-sm leading-6 text-muted">{selectedReview.aiSummary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill className="bg-sage-100 text-sage-700">{selectedReview.completedTasks.length} completed</StatusPill>
                  <StatusPill className="bg-lavender-100 text-lavender-700">{selectedReview.postponedTasks.length} postponed</StatusPill>
                  <StatusPill className="bg-peach-100 text-peach-700">{selectedReview.missedTasks.length} missed</StatusPill>
                </div>
              </div>
            ) : (
              <EmptyState title="No review yet" description="Generate an AI summary or save a manual reflection for this date." />
            )}
          </div>

          <div className="planner-card p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-bold text-ink">Trend range</h2>
                <p className="text-sm text-muted">Completion trend and focus time use the selected range.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {chartRanges.map((range) => (
                  <button
                    suppressHydrationWarning
                    key={range.days}
                    onClick={() => setChartRangeDays(range.days)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      chartRangeDays === range.days ? "bg-sage-700 text-white" : "bg-sage-50 text-sage-700"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="planner-card p-6">
              <h2 className="text-lg font-bold text-ink">Completion trend</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e3de" />
                    <XAxis dataKey="label" stroke="#737970" fontSize={12} interval="preserveStartEnd" minTickGap={18} />
                    <YAxis stroke="#737970" fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="completion" stroke="#4a6549" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="productivity" stroke="#61597f" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="planner-card p-6">
              <h2 className="text-lg font-bold text-ink">Focus time</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e3e3de" />
                    <XAxis dataKey="label" stroke="#737970" fontSize={12} interval="preserveStartEnd" minTickGap={18} />
                    <YAxis stroke="#737970" fontSize={12} />
                    <Tooltip />
                    <Area type="monotone" dataKey="focus" stroke="#426276" fill="#d9eefb" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="planner-card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-ink">Activity heatmap</h2>
              <StatusPill className="bg-sage-100 text-sage-700">{chartRangeDays} days</StatusPill>
            </div>
            <div className="mt-4 flex max-w-sm flex-wrap gap-1.5">
              {heatmap.map((day) => (
                <button
                  suppressHydrationWarning
                  key={day.date}
                  title={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  className={`h-3.5 w-3.5 rounded-[4px] ${heatColor(day.level)} transition hover:scale-125`}
                />
              ))}
            </div>
          </div>

          <div className="planner-card p-6">
            <h2 className="text-xl font-bold text-ink">Category summaries</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(selectedReview?.categorySummaries ?? fallbackCategorySummaries(todayTasks)).length ? (
                (selectedReview?.categorySummaries ?? fallbackCategorySummaries(todayTasks)).map((category) => (
                  <div key={category.category} className="rounded-2xl bg-white/70 p-4">
                    <p className="font-bold text-ink">{category.category}</p>
                    <p className="mt-1 text-sm text-muted">{Math.round(category.totalMinutes / 60 * 10) / 10}h - {category.completedItems.length} items</p>
                    <p className="mt-3 text-sm leading-6 text-muted">{category.insight}</p>
                    <p className="mt-2 text-sm font-semibold text-sage-700">{category.suggestion}</p>
                  </div>
                ))
              ) : (
                <div className="md:col-span-2">
                  <EmptyState title="No category data yet" description="Complete tasks or generate a review to build category summaries." />
                </div>
              )}
            </div>
          </div>

          <div className="planner-card p-6">
            <h2 className="text-xl font-bold text-ink">Review log</h2>
            <div className="mt-4 space-y-3">
              {reviews.length ? (
                reviews.map((review) => (
                  <button
                    suppressHydrationWarning
                    key={review.id}
                    className="flex w-full items-center justify-between rounded-2xl bg-white/70 p-4 text-left transition hover:bg-sage-50"
                    onClick={() => setSelectedDate(review.date)}
                  >
                    <div>
                      <p className="font-bold text-ink">{review.date}</p>
                      <p className="text-sm text-muted">{review.aiSummary.slice(0, 92)}...</p>
                    </div>
                    <StatusPill className="bg-sage-100 text-sage-700">{review.completionRate}%</StatusPill>
                  </button>
                ))
              ) : (
                <EmptyState title="No history yet" description="Your daily review log will appear here." />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function fallbackCategorySummaries(tasks: Array<{ category: string; estimatedMinutes: number; status: string; title: string }>): CategorySummary[] {
  const grouped = tasks.reduce<Record<string, typeof tasks>>((acc, task) => {
    acc[task.category] = [...(acc[task.category] ?? []), task];
    return acc;
  }, {});
  return Object.entries(grouped).map(([category, items]) => ({
    category,
    totalMinutes: items.reduce((sum, item) => sum + item.estimatedMinutes, 0),
    completedItems: items.filter((item) => item.status === "done").map((item) => item.title),
    insight: "Generate an AI summary to get a more nuanced category insight.",
    suggestion: "Keep the next action small and scheduled."
  }));
}

function heatColor(level: number) {
  return ["bg-sage-50", "bg-sage-100", "bg-sage-200", "bg-sage-300", "bg-sage-700"][level] ?? "bg-sage-50";
}
