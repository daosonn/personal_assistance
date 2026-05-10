import type { CalendarEvent, DailyPlan, DailyReview, Task, UserSettings } from "./types";

export const defaultSettings: UserSettings = {
  dayResetTime: "05:00",
  defaultReminderBeforeMinutes: 10,
  wakeTime: "07:00",
  sleepTime: "00:30",
  preferredFocusTime: "09:00-12:00",
  maxDeepWorkMinutes: 90,
  minBreakMinutes: 10,
  quietHoursStart: "23:30",
  quietHoursEnd: "07:00"
};

export const mockTasks: Task[] = [];
export const mockEvents: CalendarEvent[] = [];
export const mockPlans: DailyPlan[] = [];
export const mockReviews: DailyReview[] = [];
