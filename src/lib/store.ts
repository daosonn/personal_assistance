"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mockEvents, mockPlans, mockReviews, mockTasks, defaultSettings } from "./mock-data";
import type { CalendarEvent, DailyPlan, DailyReview, PlannerStateSnapshot, Task, TaskStatus } from "./types";
import {
  calculateDurationMinutes,
  calculateEndTime,
  getNextWorkingDayKey,
  getWorkingDayKey,
  getWorkingDayKeyFromParts
} from "./time";

interface PlannerStore {
  tasks: Task[];
  events: CalendarEvent[];
  plans: DailyPlan[];
  reviews: DailyReview[];
  settings: typeof defaultSettings;
  selectedDate: string;
  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "source"> & { id?: string; source?: Task["source"] }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  addEvent: (event: Omit<CalendarEvent, "id" | "durationMinutes" | "source"> & { id?: string; source?: CalendarEvent["source"] }) => void;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  upsertPlan: (plan: DailyPlan) => void;
  approvePlan: (date: string) => void;
  upsertReview: (review: DailyReview) => void;
  setSelectedDate: (date: string) => void;
  snapshot: () => PlannerStateSnapshot;
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function addCalendarDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function calendarDateForWorkingTime(workingDate: string, time: string) {
  return time < "05:00" ? addCalendarDays(workingDate, 1) : workingDate;
}

function workingMinute(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const total = hours * 60 + minutes;
  return total < 300 ? total + 1440 : total;
}

function intervalFor(startTime: string, endTime: string) {
  const start = workingMinute(startTime);
  return { start, end: start + calculateDurationMinutes(startTime, endTime) };
}

function intervalsOverlap(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && a.end > b.start;
}

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set, get) => ({
      tasks: mockTasks,
      events: mockEvents,
      plans: mockPlans,
      reviews: mockReviews,
      settings: defaultSettings,
      selectedDate: getWorkingDayKey(),
      addTask: (task) => {
        const now = new Date().toISOString();
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              ...task,
              id: task.id ?? makeId("task"),
              source: task.source ?? "web",
              createdAt: now,
              updatedAt: now
            }
          ]
        }));
      },
      updateTask: (id, patch) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task
          )
        }));
      },
      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          events: state.events.filter((event) => event.taskId !== id),
          plans: state.plans.map((plan) => ({
            ...plan,
            plannedItems: plan.plannedItems.filter((item) => item.task_id !== id),
            unscheduled: plan.unscheduled.filter((item) => item.task_id !== id)
          }))
        }));
      },
      setTaskStatus: (id, status) => get().updateTask(id, { status }),
      addEvent: (event) => {
        const durationMinutes = calculateDurationMinutes(event.startTime, event.endTime);
        const newEvent = {
          ...event,
          id: event.id ?? makeId("event"),
          durationMinutes,
          source: event.source ?? "web"
        };
        set((state) => ({
          events: [...state.events, newEvent],
          tasks: newEvent.taskId
            ? state.tasks.map((task) =>
                task.id === newEvent.taskId
                  ? {
                      ...task,
                      preferredDate: getWorkingDayKeyFromParts(newEvent.date, newEvent.startTime),
                      preferredTime: newEvent.startTime,
                      scheduledEventId: newEvent.id,
                      updatedAt: new Date().toISOString()
                    }
                  : task
              )
            : state.tasks
        }));
      },
      updateEvent: (id, patch) => {
        set((state) => ({
          events: state.events.map((event) => {
            if (event.id !== id) return event;
            const next = { ...event, ...patch };
            const durationMinutes =
              patch.durationMinutes ??
              (patch.startTime || patch.endTime
                ? calculateDurationMinutes(next.startTime, next.endTime)
                : next.durationMinutes);
            const endTime =
              patch.durationMinutes && !patch.endTime
                ? calculateEndTime(next.startTime, patch.durationMinutes)
                : next.endTime;
            return { ...next, durationMinutes, endTime };
          }),
          tasks: state.tasks.map((task) => {
            const originalEvent = state.events.find((event) => event.id === id);
            if (!originalEvent?.taskId || task.id !== originalEvent.taskId) return task;
            const nextEvent = {
              ...originalEvent,
              ...patch,
              durationMinutes:
                patch.durationMinutes ??
                (patch.startTime || patch.endTime
                  ? calculateDurationMinutes(
                      patch.startTime ?? originalEvent.startTime,
                      patch.endTime ?? originalEvent.endTime
                    )
                  : originalEvent.durationMinutes)
            };
            return {
              ...task,
              preferredDate: getWorkingDayKeyFromParts(nextEvent.date, nextEvent.startTime),
              preferredTime: nextEvent.startTime,
              updatedAt: new Date().toISOString()
            };
          })
        }));
      },
      deleteEvent: (id) => set((state) => ({ events: state.events.filter((event) => event.id !== id) })),
      upsertPlan: (plan) => {
        set((state) => ({
          plans: [plan, ...state.plans.filter((item) => item.date !== plan.date)]
        }));
      },
      approvePlan: (date) => {
        set((state) => {
          const plan = state.plans.find((item) => item.date === date);
          if (!plan) return state;

          const now = new Date().toISOString();
          const plannedTaskEventIds = new Map<string, string>();
          const planTaskEvents: CalendarEvent[] = plan.plannedItems.map((item, index) => {
            const eventId = `event-ai-${plan.id}-${index}`;
            if (!plannedTaskEventIds.has(item.task_id)) plannedTaskEventIds.set(item.task_id, eventId);
            return {
              id: eventId,
              title: item.title,
              date: calendarDateForWorkingTime(plan.date, item.start_time),
              startTime: item.start_time,
              endTime: item.end_time,
              durationMinutes: calculateDurationMinutes(item.start_time, item.end_time),
              category: item.category,
              type: "task",
              priority: item.priority,
              status: "planned",
              source: "ai",
              isFixed: false,
              canMove: true,
              taskId: item.task_id,
              notes: item.reason
            };
          });
          const busyIntervals = [
            ...plan.fixedBlocks.map((item) => intervalFor(item.start_time, item.end_time)),
            ...plan.plannedItems.map((item) => intervalFor(item.start_time, item.end_time))
          ];
          const validBreaks = plan.breaks.filter((item) => {
            const interval = intervalFor(item.start_time, item.end_time);
            return interval.end > interval.start && !busyIntervals.some((busy) => intervalsOverlap(interval, busy));
          });
          const planBreakEvents: CalendarEvent[] = validBreaks.map((item, index) => ({
            id: `event-ai-${plan.id}-break-${index}`,
            title: "Break",
            date: calendarDateForWorkingTime(plan.date, item.start_time),
            startTime: item.start_time,
            endTime: item.end_time,
            durationMinutes: calculateDurationMinutes(item.start_time, item.end_time),
            category: "Break",
            type: "break",
            priority: "low",
            status: "planned",
            source: "ai",
            isFixed: false,
            canMove: true,
            notes: item.reason
          }));

          const nextEvents = [
            ...state.events.filter(
              (event) =>
                !(
                  event.source === "ai" &&
                  (event.type === "break" || event.taskId) &&
                  getWorkingDayKeyFromParts(event.date, event.startTime) === date
                )
            ),
            ...planTaskEvents,
            ...planBreakEvents
          ];

          return {
            events: nextEvents,
            tasks: state.tasks.map((task) => {
              const eventId = plannedTaskEventIds.get(task.id);
              if (!eventId) return task;
              const event = planTaskEvents.find((item) => item.id === eventId);
              if (!event) return task;
              return {
                ...task,
                status: task.status === "done" ? task.status : "planned",
                preferredDate: getWorkingDayKeyFromParts(event.date, event.startTime),
                preferredTime: event.startTime,
                scheduledEventId: event.id,
                updatedAt: now
              };
            }),
            plans: state.plans.map((item) =>
              item.date === date ? { ...item, status: "approved", approvedAt: now } : item
            )
          };
        });
      },
      upsertReview: (review) => {
        set((state) => ({
          reviews: [review, ...state.reviews.filter((item) => item.date !== review.date)]
        }));
      },
      setSelectedDate: (date) => set({ selectedDate: date }),
      snapshot: () => {
        const state = get();
        return {
          tasks: state.tasks,
          events: state.events,
          plans: state.plans,
          reviews: state.reviews,
          settings: state.settings
        };
      }
    }),
    {
      name: "personal-planner-assistant-v2-empty-start",
      partialize: (state) => ({
        tasks: state.tasks,
        events: state.events,
        plans: state.plans,
        reviews: state.reviews,
        settings: state.settings,
        selectedDate: state.selectedDate
      })
    }
  )
);

export function makeTomorrowTask(
  title: string,
  options?: { estimatedMinutes?: number; preferredTime?: string }
): Omit<Task, "id" | "createdAt" | "updatedAt" | "source"> {
  const tomorrow = getNextWorkingDayKey();
  return {
    title,
    description: "",
    category: "Personal",
    priority: "medium",
    status: "pending",
    estimatedMinutes: options?.estimatedMinutes ?? 45,
    preferredDate: tomorrow,
    preferredTime: options?.preferredTime || undefined,
    isFixed: false,
    canMove: true,
    important: true,
    urgent: false
  };
}
