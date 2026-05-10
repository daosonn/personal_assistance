import type { CalendarEvent, Task } from "./types";
import { calculateDurationMinutes } from "./time";

export function sortTasksForPlanning(tasks: Task[]) {
  const priorityScore = { high: 3, medium: 2, low: 1 };
  return [...tasks].sort((a, b) => {
    if (a.isFixed !== b.isFixed) return a.isFixed ? -1 : 1;
    if (a.canMove !== b.canMove) return a.canMove ? 1 : -1;
    return priorityScore[b.priority] - priorityScore[a.priority];
  });
}

export function fixedEventsFirst(events: CalendarEvent[]) {
  return [...events].sort((a, b) => {
    if (a.isFixed !== b.isFixed) return a.isFixed ? -1 : 1;
    if (a.canMove !== b.canMove) return a.canMove ? 1 : -1;
    return a.startTime.localeCompare(b.startTime);
  });
}

export function normalizeEventDuration(event: Pick<CalendarEvent, "startTime" | "endTime">) {
  return calculateDurationMinutes(event.startTime, event.endTime);
}

export function isEventProtected(event: Pick<CalendarEvent, "isFixed" | "canMove">) {
  return event.isFixed || event.canMove === false;
}
