import type { PlannerStateSnapshot } from "./types";

export function dailySummaryPrompt(snapshot: PlannerStateSnapshot, date: string) {
  return `
Summarize the user's day in friendly, concise English.

Date: ${date}
Working day reset time: ${snapshot.settings.dayResetTime}

Input data:
${JSON.stringify(snapshot, null, 2)}

Return valid JSON only with this shape:
{
  "overall_summary": "short summary",
  "completion_rate": number,
  "focus_minutes": number,
  "mood_guess": "great|good|normal|tired|bad",
  "category_summaries": [
    {
      "category": "Japanese",
      "total_minutes": number,
      "completed_items": ["..."],
      "insight": "...",
      "suggestion": "..."
    }
  ],
  "completed_tasks": ["..."],
  "postponed_tasks": ["..."],
  "missed_tasks": ["..."],
  "what_went_well": ["..."],
  "what_to_improve": ["..."],
  "suggestions_for_tomorrow": ["..."]
}

Rules:
- Group by categories present in the data.
- Do not exaggerate achievements when data is thin.
- Be supportive, practical, and non-judgmental.
`;
}

export function morningPlanPrompt(
  snapshot: PlannerStateSnapshot,
  date: string,
  context?: {
    currentDateTime?: string;
    currentLocalTime?: string;
    timezone?: string;
    isCurrentWorkingDay?: boolean;
    adjustmentPrompt?: string;
  }
) {
  return `
Create a personal plan for the working day ${date}.

Current replanning context:
- Current datetime: ${context?.currentDateTime ?? "unknown"}
- Current local time: ${context?.currentLocalTime ?? "unknown"}
- User timezone: ${context?.timezone ?? "unknown"}
- Is this the current working day: ${context?.isCurrentWorkingDay ? "yes" : "no"}

Working-day rules:
- A working day starts at 05:00 and ends at 04:59 the next calendar day.
- Calendar still displays 00:00-23:59, but events from 00:00-04:59 may logically belong to the previous working day.
- Existing calendar events are pre-scheduled.
- Fixed events or events with canMove=false must not be moved.
- Flexible tasks should be planned around fixed blocks.
- Do not overlap scheduled items.
- Prefer high priority tasks and near deadlines.
- Add short breaks after long focus blocks.
- If there are too many tasks, leave lower priority items unscheduled.
- If this is the current working day, do not schedule unfinished tasks before the current local time.
- For same-day replanning, start new flexible work after the current local time with a small buffer.
- Never return a start_time that has already passed for pending/planned tasks on the current working day.
- Put a short rest break between separate planned task blocks whenever possible.
- Use 5-15 minute breaks between tasks by default, and at least 10 minutes after focus blocks longer than 60 minutes.
- Breaks must not overlap planned items or fixed blocks.
- If the user asks for changes, revise the existing plan in the input data according to that request while still respecting all fixed events and time rules.

User adjustment request:
${context?.adjustmentPrompt?.trim() ? context.adjustmentPrompt.trim() : "No extra adjustment request."}

Input data:
${JSON.stringify(snapshot, null, 2)}

Return valid JSON only with this shape:
{
  "date": "YYYY-MM-DD",
  "summary": "short plan summary",
  "fixed_blocks": [
    {
      "event_id": "...",
      "title": "...",
      "start_time": "HH:mm",
      "end_time": "HH:mm",
      "reason": "..."
    }
  ],
  "planned_items": [
    {
      "task_id": "...",
      "title": "...",
      "start_time": "HH:mm",
      "end_time": "HH:mm",
      "category": "...",
      "priority": "high|medium|low",
      "reason": "..."
    }
  ],
  "breaks": [
    {
      "start_time": "HH:mm",
      "end_time": "HH:mm",
      "reason": "..."
    }
  ],
  "unscheduled": [
    {
      "task_id": "...",
      "title": "...",
      "reason": "..."
    }
  ],
  "warnings": ["..."],
  "suggestions": ["..."]
}
`;
}

export const plannerSystemPrompt =
  "You are a calm personal planning assistant. Return strict JSON only. Respect fixed calendar events and the 05:00 working-day reset.";
