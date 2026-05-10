import { describe, expect, it } from "vitest";
import { fixedEventsFirst, isEventProtected, sortTasksForPlanning } from "./scheduling";
import type { CalendarEvent, Task } from "./types";

const baseTask: Task = {
  id: "task",
  title: "Task",
  category: "Work",
  priority: "low",
  status: "pending",
  estimatedMinutes: 30,
  source: "mock",
  isFixed: false,
  canMove: true,
  important: false,
  urgent: false,
  createdAt: "",
  updatedAt: ""
};

const baseEvent: CalendarEvent = {
  id: "event",
  title: "Event",
  date: "2026-05-09",
  startTime: "09:00",
  endTime: "10:00",
  durationMinutes: 60,
  category: "Work",
  type: "task",
  priority: "medium",
  status: "planned",
  source: "mock",
  isFixed: false,
  canMove: true
};

describe("scheduling priority", () => {
  it("prioritizes fixed and immovable tasks before flexible tasks", () => {
    const sorted = sortTasksForPlanning([
      { ...baseTask, id: "flex", priority: "high" },
      { ...baseTask, id: "fixed", isFixed: true, canMove: false, priority: "low" }
    ]);
    expect(sorted[0].id).toBe("fixed");
  });

  it("places protected events first", () => {
    const sorted = fixedEventsFirst([
      { ...baseEvent, id: "flex" },
      { ...baseEvent, id: "locked", isFixed: true, canMove: false }
    ]);
    expect(sorted[0].id).toBe("locked");
  });

  it("treats fixed or canMove=false events as protected", () => {
    expect(isEventProtected({ isFixed: false, canMove: false })).toBe(true);
    expect(isEventProtected({ isFixed: true, canMove: true })).toBe(true);
  });
});
