"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleSlash,
  Clock3,
  ListChecks,
  Play,
  Plus,
  Sparkles,
  Target,
  TimerReset,
  Trash2,
  Undo2
} from "lucide-react";
import { format } from "date-fns";
import { Button, EmptyState, PageHeader, StatCard, StatusPill } from "./ui";
import { usePlannerStore } from "@/lib/store";
import type { DailyPlan, PlannedItem, Priority, Task } from "@/lib/types";
import { calculateDurationMinutes, calculateEndTime, fromMinutes, getWorkingDayKey, getWorkingDayKeyFromParts, toMinutes } from "@/lib/time";

const priorityClass: Record<Priority, string> = {
  high: "bg-peach-100 text-peach-700",
  medium: "bg-lavender-100 text-lavender-700",
  low: "bg-sage-100 text-sage-700"
};

const filters = ["all", "in_progress", "pending", "done", "high"] as const;

export function TodayDashboard() {
  const {
    tasks,
    events,
    plans,
    settings,
    setTaskStatus,
    updateTask,
    deleteTask,
    addTask,
    upsertPlan,
    approvePlan,
    snapshot
  } = usePlannerStore();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [isPlanning, setIsPlanning] = useState(false);
  const [aiError, setAiError] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDurationMinutes, setQuickDurationMinutes] = useState(45);
  const [quickPreferredTime, setQuickPreferredTime] = useState("");
  const [adjustmentPrompt, setAdjustmentPrompt] = useState("");

  const date = getWorkingDayKey();
  const todayTasks = tasks.filter((task) => task.preferredDate === date);
  const todayEvents = events
    .filter((event) => getWorkingDayKeyFromParts(event.date, event.startTime) === date)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const currentPlan = plans.find((plan) => plan.date === date);
  const plannedItemByTaskId = useMemo(() => {
    return new Map((currentPlan?.plannedItems ?? []).map((item) => [item.task_id, item]));
  }, [currentPlan]);
  const completed = todayTasks.filter((task) => task.status === "done");
  const pending = todayTasks.filter((task) => !["done", "cancelled"].includes(task.status));
  const highPriority = todayTasks.filter((task) => task.priority === "high");
  const unscheduled = todayTasks.filter((task) => !task.scheduledEventId && task.status !== "done");
  const completionRate = todayTasks.length ? Math.round((completed.length / todayTasks.length) * 100) : 0;
  const focusMinutes = todayEvents
    .filter((event) => event.type === "focus" || event.type === "task")
    .reduce((sum, event) => sum + event.durationMinutes, 0);

  const filteredTasks = todayTasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "high") return task.priority === "high";
    if (filter === "pending") return !["done", "cancelled"].includes(task.status);
    return task.status === filter;
  });

  const matrix = useMemo(
    () => [
      { title: "Do first", subtitle: "Important + urgent", tasks: todayTasks.filter((task) => task.important && task.urgent), tone: "bg-peach-50" },
      { title: "Schedule", subtitle: "Important + not urgent", tasks: todayTasks.filter((task) => task.important && !task.urgent), tone: "bg-sage-50" },
      { title: "Delegate", subtitle: "Not important + urgent", tasks: todayTasks.filter((task) => !task.important && task.urgent), tone: "bg-skysoft-50" },
      { title: "Reduce", subtitle: "Not important + not urgent", tasks: todayTasks.filter((task) => !task.important && !task.urgent), tone: "bg-lavender-50" }
    ],
    [todayTasks]
  );

  async function handleReplan() {
    setIsPlanning(true);
    setAiError("");
    try {
      const response = await fetch("/api/ai/morning-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          snapshot: snapshot(),
          currentDateTime: new Date().toISOString(),
          currentLocalTime: format(new Date(), "HH:mm"),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          isCurrentWorkingDay: date === getWorkingDayKey(),
          adjustmentPrompt: adjustmentPrompt.trim() || undefined
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error([result.message, result.detail].filter(Boolean).join(" "));
      }
      const data = result.data;
      const sanitized = sanitizePlan(data, date);
      const plan: DailyPlan = {
        id: `plan-${date}-${Date.now()}`,
        date: sanitized.date,
        status: "ready",
        summary: sanitized.summary,
        aiInsights: sanitized.suggestions,
        fixedBlocks: sanitized.fixed_blocks,
        plannedItems: sanitized.planned_items,
        breaks: sanitized.breaks,
        unscheduled: sanitized.unscheduled,
        warnings: sanitized.warnings,
        suggestions: sanitized.suggestions,
        createdBy: "ai",
        createdAt: new Date().toISOString()
      };
      upsertPlan(plan);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI planning failed.");
    } finally {
      setIsPlanning(false);
    }
  }

  function updatePlannedItemTime(index: number, patch: Partial<Pick<PlannedItem, "start_time" | "end_time">>) {
    if (!currentPlan) return;
    upsertPlan({
      ...currentPlan,
      status: "ready",
      approvedAt: undefined,
      plannedItems: currentPlan.plannedItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    });
  }

  function handleAddQuickTask() {
    if (!quickTitle.trim()) return;
    addTask({
      title: quickTitle.trim(),
      category: "Personal",
      priority: "medium",
      status: "pending",
      estimatedMinutes: quickDurationMinutes,
      preferredDate: date,
      preferredTime: quickPreferredTime || undefined,
      source: "web",
      isFixed: false,
      canMove: true,
      important: true,
      urgent: false
    });
    setQuickTitle("");
    setQuickPreferredTime("");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Today Dashboard"
        title={`Good morning, today is ${format(new Date(), "MMM d, yyyy")}`}
        description={`Working day: ${settings.dayResetTime} today to 04:59 tomorrow. Review the plan, protect fixed blocks, and keep the day realistic.`}
        actions={
          <>
            <Button variant="secondary" onClick={handleAddQuickTask}>
              <Plus size={17} />
              Add task
            </Button>
            <Button onClick={handleReplan} disabled={isPlanning}>
              <Sparkles size={17} />
              {isPlanning ? "Planning..." : "AI Re-plan"}
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-2 rounded-2xl bg-white/60 p-3 shadow-sm lg:grid-cols-[1fr_140px_150px_auto]">
        <input
          className="soft-input flex-1"
          value={quickTitle}
          onChange={(event) => setQuickTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAddQuickTask();
          }}
          placeholder="Quick add a task for today..."
        />
        <label className="grid gap-1">
          <span className="px-1 text-xs font-bold text-muted">Duration</span>
          <input
            className="soft-input w-full"
            min={5}
            step={5}
            type="number"
            value={quickDurationMinutes}
            onChange={(event) => setQuickDurationMinutes(Math.max(5, Number(event.target.value) || 5))}
          />
        </label>
        <label className="grid gap-1">
          <span className="px-1 text-xs font-bold text-muted">Preferred time</span>
          <input
            className="soft-input w-full"
            type="time"
            value={quickPreferredTime}
            onChange={(event) => setQuickPreferredTime(event.target.value)}
          />
        </label>
        <Button variant="secondary" onClick={handleAddQuickTask}>
          Add
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ListChecks} label="Total tasks" value={`${todayTasks.length}`} helper={`${pending.length} still active`} />
        <StatCard icon={CheckCircle2} label="Completed" value={`${completed.length}`} helper={`${completionRate}% completion`} tone="sage" />
        <StatCard icon={Clock3} label="Focus time" value={`${Math.round(focusMinutes / 60 * 10) / 10}h`} helper="Scheduled focus blocks" tone="sky" />
        <StatCard icon={Target} label="High priority" value={`${highPriority.length}`} helper={`${unscheduled.length} unscheduled`} tone="peach" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <div className="planner-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-700 text-white">
                <Bot size={22} />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-ink">AI plan insight</h2>
                  <StatusPill className={currentPlan?.status === "approved" ? "bg-sage-100 text-sage-700" : "bg-lavender-100 text-lavender-700"}>
                    {currentPlan?.status ?? "not planned"}
                  </StatusPill>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {currentPlan?.summary ??
                    "No AI plan exists yet. Use AI Re-plan to generate a schedule around your fixed calendar blocks."}
                </p>
                {currentPlan?.warnings?.length ? (
                  <div className="mt-3 rounded-2xl bg-peach-50 p-3 text-sm text-peach-700">
                    {currentPlan.warnings[0]}
                  </div>
                ) : null}
                {currentPlan?.plannedItems?.length ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-bold text-ink">Planned schedule</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {currentPlan.plannedItems.map((item, index) => (
                        <div key={`${item.task_id}-${index}`} className="rounded-2xl border border-sage-100 bg-white/70 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-bold text-ink">{item.title}</p>
                            <p className="shrink-0 rounded-full bg-sage-100 px-2 py-1 text-xs font-bold text-sage-700">
                              {item.start_time}-{item.end_time}
                            </p>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <label>
                              <span className="text-xs font-bold text-muted">Start</span>
                              <input
                                className="soft-input mt-1 w-full"
                                type="time"
                                value={item.start_time}
                                onChange={(event) => updatePlannedItemTime(index, { start_time: event.target.value })}
                              />
                            </label>
                            <label>
                              <span className="text-xs font-bold text-muted">End</span>
                              <input
                                className="soft-input mt-1 w-full"
                                type="time"
                                value={item.end_time}
                                onChange={(event) => updatePlannedItemTime(index, { end_time: event.target.value })}
                              />
                            </label>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {aiError ? <p className="mt-3 text-sm font-semibold text-red-700">{aiError}</p> : null}
                {currentPlan ? (
                  <div className="mt-4 rounded-2xl bg-sage-50/70 p-3">
                    <label>
                      <span className="text-sm font-bold text-sage-900">Adjustment prompt</span>
                      <textarea
                        className="soft-input mt-2 min-h-20 w-full"
                        value={adjustmentPrompt}
                        onChange={(event) => setAdjustmentPrompt(event.target.value)}
                        placeholder="Example: move Japanese after 9am, add longer breaks, keep training before lunch..."
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={handleReplan} disabled={isPlanning}>
                        <Sparkles size={17} />
                        {isPlanning ? "Planning..." : "Regenerate with note"}
                      </Button>
                      {currentPlan.status !== "approved" ? (
                        <Button onClick={() => approvePlan(date)}>Approve plan</Button>
                      ) : (
                        <Button onClick={() => approvePlan(date)}>Sync calendar</Button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="planner-card p-6">
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold text-ink">Today&apos;s tasks</h2>
                <p className="text-sm text-muted">Update status quickly as the day changes.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.map((item) => (
                  <button
                    suppressHydrationWarning
                    key={item}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${filter === item ? "bg-sage-700 text-white" : "bg-sage-50 text-sage-700"}`}
                    onClick={() => setFilter(item)}
                  >
                    {item.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {filteredTasks.length ? (
                filteredTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    plannedItem={plannedItemByTaskId.get(task.id)}
                    setTaskStatus={setTaskStatus}
                    updateTask={updateTask}
                    deleteTask={deleteTask}
                  />
                ))
              ) : (
                <EmptyState title="No tasks in this filter" description="Try another filter or add a task for today." />
              )}
            </div>
          </div>

          <div className="planner-card p-6">
            <h2 className="text-xl font-bold text-ink">Eisenhower matrix</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {matrix.map((group) => (
                <div key={group.title} className={`rounded-2xl ${group.tone} p-4`}>
                  <p className="font-bold text-ink">{group.title}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{group.subtitle}</p>
                  <div className="mt-3 space-y-2">
                    {group.tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-ink">
                        {task.title}
                      </div>
                    ))}
                    {!group.tasks.length ? <p className="text-sm text-muted">Clear for now.</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="planner-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <TimerReset size={19} className="text-sage-700" />
              <h2 className="text-lg font-bold text-ink">Progress</h2>
            </div>
            <div className="h-3 rounded-full bg-sage-100">
              <div className="h-3 rounded-full bg-sage-700" style={{ width: `${completionRate}%` }} />
            </div>
            <p className="mt-3 text-sm text-muted">{completed.length} done, {pending.length} active, {completionRate}% complete.</p>
          </div>

          <div className="planner-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock size={19} className="text-skysoft-700" />
              <h2 className="text-lg font-bold text-ink">Timeline</h2>
            </div>
            <div className="space-y-3">
              {todayEvents.length ? (
                todayEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-sage-100 bg-white/70 p-3">
                    <div className="flex justify-between gap-3">
                      <p className="font-bold text-ink">{event.title}</p>
                      <p className="text-xs font-bold text-sage-700">{event.startTime}-{event.endTime}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted">{event.category} - {event.isFixed ? "fixed" : "flexible"}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="No timeline yet" description="Approve an AI plan or add calendar events to build today's timeline." />
              )}
            </div>
          </div>

          <div className="planner-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle size={19} className="text-peach-700" />
              <h2 className="text-lg font-bold text-ink">Warnings</h2>
            </div>
            <div className="space-y-2 text-sm text-muted">
              {unscheduled.length ? <p>{unscheduled.length} task(s) are not scheduled yet.</p> : <p>All active planned tasks have schedule links.</p>}
              {highPriority.length > 2 ? <p>There are several high-priority tasks today. Keep breaks visible.</p> : null}
              <p>05:00 is marked as the planning reset, not midnight.</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function TaskRow({
  task,
  plannedItem,
  setTaskStatus,
  updateTask,
  deleteTask
}: {
  task: Task;
  plannedItem?: PlannedItem;
  setTaskStatus: (id: string, status: Task["status"]) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
}) {
  function handleDelete() {
    if (window.confirm(`Delete "${task.title}"? This also removes its linked calendar event.`)) {
      deleteTask(task.id);
    }
  }

  return (
    <div className="rounded-2xl border border-sage-100 bg-white/70 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-ink">{task.title}</p>
            <StatusPill className={priorityClass[task.priority]}>{task.priority}</StatusPill>
            <StatusPill className="bg-sage-50 text-sage-700">{task.status.replace("_", " ")}</StatusPill>
          </div>
          <p className="mt-1 text-sm text-muted">
            {task.category} - {task.estimatedMinutes}m {task.preferredTime ? `- preferred ${task.preferredTime}` : ""}
          </p>
          {plannedItem ? (
            <p className="mt-2 inline-flex rounded-full bg-skysoft-50 px-3 py-1 text-xs font-bold text-skysoft-700">
              AI planned: {plannedItem.start_time}-{plannedItem.end_time}
            </p>
          ) : null}
          {task.notes ? <p className="mt-2 text-sm text-muted">{task.notes}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-2xl bg-sage-50/70 p-1">
          <TaskAction label="Done" onClick={() => setTaskStatus(task.id, "done")} icon={<Check size={16} />} />
          <TaskAction label="Defer" onClick={() => setTaskStatus(task.id, "postponed")} icon={<Undo2 size={16} />} />
          <TaskAction label="Skip" onClick={() => setTaskStatus(task.id, "cancelled")} icon={<CircleSlash size={16} />} />
          <TaskAction label="Start" onClick={() => updateTask(task.id, { status: "in_progress" })} icon={<Play size={16} />} />
          <TaskAction label="Delete" onClick={handleDelete} icon={<Trash2 size={16} />} />
        </div>
      </div>
    </div>
  );
}

type MorningPlanData = {
  date: string;
  summary: string;
  fixed_blocks: DailyPlan["fixedBlocks"];
  planned_items: PlannedItem[];
  breaks: DailyPlan["breaks"];
  unscheduled: DailyPlan["unscheduled"];
  warnings: string[];
  suggestions: string[];
};

function workingMinute(time: string) {
  const minutes = toMinutes(time);
  return minutes < 300 ? minutes + 1440 : minutes;
}

function roundedCurrentWorkingMinute() {
  const now = new Date();
  const current = workingMinute(format(now, "HH:mm"));
  return Math.ceil((current + 10) / 5) * 5;
}

function sanitizePlan(data: MorningPlanData, targetDate: string): MorningPlanData {
  return sanitizePlanBreaks(sanitizeSameDayPlan(data, targetDate));
}

function sanitizeSameDayPlan(data: MorningPlanData, targetDate: string): MorningPlanData {
  if (targetDate !== getWorkingDayKey()) return data;

  let cursor = roundedCurrentWorkingMinute();
  const workingDayEnd = 24 * 60 + 4 * 60 + 59;
  const shiftedItems: PlannedItem[] = [];
  const shiftedUnscheduled = [...data.unscheduled];
  let shiftedCount = 0;

  for (const item of data.planned_items) {
    const originalStart = workingMinute(item.start_time);
    const duration = calculateDurationMinutes(item.start_time, item.end_time);
    const start = Math.max(originalStart, cursor);
    const end = start + duration;

    if (end > workingDayEnd) {
      shiftedUnscheduled.push({
        task_id: item.task_id,
        title: item.title,
        reason: "Not enough remaining time in the current working day after same-day replan."
      });
      continue;
    }

    if (start !== originalStart) shiftedCount += 1;
    shiftedItems.push({
      ...item,
      start_time: fromMinutes(start),
      end_time: calculateEndTime(fromMinutes(start), duration),
      reason:
        start !== originalStart
          ? `${item.reason} Shifted after the current time because the original slot had already passed.`
          : item.reason
    });
    cursor = end;
  }

  return {
    ...data,
    planned_items: shiftedItems,
    unscheduled: shiftedUnscheduled,
    warnings:
      shiftedCount > 0
        ? [
            `${shiftedCount} planned item(s) were moved after the current time because AI returned past slots.`,
            ...data.warnings
          ]
        : data.warnings
  };
}

function intervalFor(startTime: string, endTime: string) {
  const start = workingMinute(startTime);
  return { start, end: start + calculateDurationMinutes(startTime, endTime) };
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && a.end > b.start;
}

function sanitizePlanBreaks(data: MorningPlanData): MorningPlanData {
  const busyIntervals = [
    ...data.fixed_blocks.map((block) => intervalFor(block.start_time, block.end_time)),
    ...data.planned_items.map((item) => intervalFor(item.start_time, item.end_time))
  ];
  let removedCount = 0;
  const validBreaks = data.breaks.filter((item) => {
    const interval = intervalFor(item.start_time, item.end_time);
    const invalid =
      interval.end <= interval.start ||
      busyIntervals.some((busy) => overlaps(interval, busy));
    if (invalid) removedCount += 1;
    return !invalid;
  });

  return {
    ...data,
    breaks: validBreaks,
    warnings:
      removedCount > 0
        ? [`${removedCount} break(s) overlapped planned work and were removed.`, ...data.warnings]
        : data.warnings
  };
}

function TaskAction({
  label,
  icon,
  onClick
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      suppressHydrationWarning
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sage-900 transition hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-sage-200"
    >
      {icon}
    </button>
  );
}
