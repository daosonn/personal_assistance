import { addDays, format, isBefore, parse, startOfDay } from "date-fns";

export const RESET_TIME = "05:00" as const;

export function todayKey(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export function getWorkingDayKey(date = new Date(), resetTime = RESET_TIME) {
  const dayStart = startOfDay(date);
  const resetAt = parse(resetTime, "HH:mm", dayStart);
  return format(isBefore(date, resetAt) ? addDays(dayStart, -1) : dayStart, "yyyy-MM-dd");
}

export function getWorkingDayKeyFromParts(date: string, time = "12:00", resetTime = RESET_TIME) {
  return getWorkingDayKey(new Date(`${date}T${time}:00`), resetTime);
}

export function getNextWorkingDayKey(date = new Date()) {
  const current = new Date(`${getWorkingDayKey(date)}T12:00:00`);
  return format(addDays(current, 1), "yyyy-MM-dd");
}

export function getPreviousWorkingDayKey(date = new Date()) {
  const current = new Date(`${getWorkingDayKey(date)}T12:00:00`);
  return format(addDays(current, -1), "yyyy-MM-dd");
}

export function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function fromMinutes(total: number) {
  const normalized = ((total % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60).toString().padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function calculateDurationMinutes(startTime: string, endTime: string) {
  const start = toMinutes(startTime);
  let end = toMinutes(endTime);
  if (end <= start) end += 1440;
  return end - start;
}

export function calculateEndTime(startTime: string, durationMinutes: number) {
  return fromMinutes(toMinutes(startTime) + durationMinutes);
}

export function addMinutesToDateTime(date: string, time: string, minutes: number) {
  const base = new Date(`${date}T${time}:00`);
  base.setMinutes(base.getMinutes() + minutes);
  return base;
}

export function eventToDateRange(date: string, startTime: string, durationMinutes: number) {
  const start = new Date(`${date}T${startTime}:00`);
  const end = addMinutesToDateTime(date, startTime, durationMinutes);
  return { start, end };
}

export function isTodayish(date: string) {
  return date === getWorkingDayKey();
}
