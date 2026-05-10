"use client";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import type { EventDropArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import { AlertCircle, CalendarPlus, Clock, Lock, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { Button, PageHeader, StatusPill } from "./ui";
import { usePlannerStore } from "@/lib/store";
import type { CalendarEvent, EventType, Priority, TaskStatus } from "@/lib/types";
import { calculateDurationMinutes, calculateEndTime, eventToDateRange, fromMinutes } from "@/lib/time";
import { isEventProtected } from "@/lib/scheduling";

const categories = ["Japanese", "Research", "AI / n8n", "Personal", "Health", "Work", "Study", "Planning"];
const eventTypes: EventType[] = ["task", "fixed", "focus", "event", "deadline", "break", "review", "routine"];

type DraftEvent = Omit<CalendarEvent, "id" | "durationMinutes" | "source"> & { id?: string; durationMinutes?: number };

const blankDraft = (date = format(new Date(), "yyyy-MM-dd")): DraftEvent => ({
  title: "",
  date,
  startTime: "09:00",
  endTime: "10:00",
  category: "Personal",
  type: "task",
  priority: "medium",
  status: "planned",
  isFixed: false,
  canMove: true,
  notes: ""
});

export function CalendarPlanner() {
  const { events, addEvent, updateEvent, deleteEvent } = usePlannerStore();
  const [draft, setDraft] = useState<DraftEvent | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);

  const calendarEvents = useMemo(
    () =>
      events.map((event) => {
        const { start, end } = eventToDateRange(event.date, event.startTime, event.durationMinutes);
        return {
          id: event.id,
          title: event.title,
          start,
          end,
          editable: !isEventProtected(event),
          durationEditable: event.canMove,
          backgroundColor: event.isFixed ? "#61597f" : colorForCategory(event.category),
          borderColor: "transparent",
          extendedProps: event
        };
      }),
    [events]
  );

  function openCreate(date?: string) {
    setMode("create");
    setDraft(blankDraft(date));
    setDurationHours(1);
    setDurationMinutes(0);
  }

  function openEdit(event: CalendarEvent) {
    setMode("edit");
    setDraft(event);
    setDurationHours(Math.floor(event.durationMinutes / 60));
    setDurationMinutes(event.durationMinutes % 60);
  }

  function handleDurationChange(hours: number, minutes: number) {
    if (!draft) return;
    const total = Math.max(5, hours * 60 + minutes);
    setDurationHours(hours);
    setDurationMinutes(minutes);
    setDraft({ ...draft, durationMinutes: total, endTime: calculateEndTime(draft.startTime, total) });
  }

  function handleTimeChange(patch: Partial<DraftEvent>) {
    if (!draft) return;
    const next = { ...draft, ...patch };
    const total = calculateDurationMinutes(next.startTime, next.endTime);
    setDurationHours(Math.floor(total / 60));
    setDurationMinutes(total % 60);
    setDraft({ ...next, durationMinutes: total });
  }

  function saveDraft() {
    if (!draft || !draft.title.trim()) return;
    const normalized = {
      ...draft,
      durationMinutes: calculateDurationMinutes(draft.startTime, draft.endTime)
    };
    if (mode === "edit" && draft.id) {
      updateEvent(draft.id, normalized);
    } else {
      addEvent(normalized);
    }
    setDraft(null);
  }

  function handleDateClick(arg: DateClickArg) {
    openCreate(format(arg.date, "yyyy-MM-dd"));
  }

  function handleDrop(arg: EventDropArg) {
    const stored = events.find((event) => event.id === arg.event.id);
    if (!stored) return;
    if (isEventProtected(stored)) {
      arg.revert();
      return;
    }
    const start = arg.event.start;
    if (!start) return;
    updateEvent(stored.id, {
      date: format(start, "yyyy-MM-dd"),
      startTime: format(start, "HH:mm"),
      endTime: calculateEndTime(format(start, "HH:mm"), stored.durationMinutes)
    });
  }

  function handleResize(arg: EventResizeDoneArg) {
    const stored = events.find((event) => event.id === arg.event.id);
    if (!stored || isEventProtected(stored) || !arg.event.start || !arg.event.end) {
      arg.revert();
      return;
    }
    const startMinutes = arg.event.start.getHours() * 60 + arg.event.start.getMinutes();
    const endMinutes = arg.event.end.getHours() * 60 + arg.event.end.getMinutes();
    const duration = endMinutes > startMinutes ? endMinutes - startMinutes : endMinutes + 1440 - startMinutes;
    updateEvent(stored.id, {
      startTime: format(arg.event.start, "HH:mm"),
      endTime: fromMinutes(startMinutes + duration),
      durationMinutes: duration
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Calendar Planner"
        title="Plan the full 24-hour day"
        description="Week and month views stay calendar-accurate from 00:00 to 23:59, while the 05:00 marker shows the personal planning reset."
        actions={
          <>
            <Button variant="secondary" onClick={() => openCreate()}>
              <CalendarPlus size={17} />
              Create event
            </Button>
            <Button>
              <Sparkles size={17} />
              AI auto-schedule
            </Button>
          </>
        }
      />

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="planner-card p-5">
          <div className="flex items-center gap-3">
            <Clock className="text-sage-700" size={20} />
            <div>
              <p className="font-bold text-ink">Reset marker</p>
              <p className="text-sm text-muted">05:00 starts the working day.</p>
            </div>
          </div>
        </div>
        <div className="planner-card p-5">
          <div className="flex items-center gap-3">
            <Lock className="text-lavender-700" size={20} />
            <div>
              <p className="font-bold text-ink">Fixed blocks protected</p>
              <p className="text-sm text-muted">Locked events cannot be moved by drag/drop or AI.</p>
            </div>
          </div>
        </div>
        <div className="planner-card p-5">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-peach-700" size={20} />
            <div>
              <p className="font-bold text-ink">Overnight supported</p>
              <p className="text-sm text-muted">Example: 23:30 to 00:30 is treated as 1 hour.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="planner-card overflow-hidden p-3">
        <div className="mb-2 rounded-2xl border border-dashed border-sage-300 bg-sage-50 px-4 py-2 text-sm font-semibold text-sage-800">
          05:00 reset line: morning planning starts here. The calendar still includes 00:00-04:59.
        </div>
        <div className="min-h-[720px]">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{ left: "prev,next today", center: "title", right: "timeGridWeek,dayGridMonth" }}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            allDaySlot={false}
            nowIndicator
            editable
            selectable
            eventResizableFromStart
            height="auto"
            events={calendarEvents}
            dateClick={handleDateClick}
            eventClick={(arg) => openEdit(arg.event.extendedProps as CalendarEvent)}
            eventDrop={handleDrop}
            eventResize={handleResize}
            slotLabelContent={(arg) => (
              <span className={arg.text === "5am" || arg.text === "05:00" ? "font-bold text-sage-700" : ""}>
                {arg.text}
              </span>
            )}
          />
        </div>
      </section>

      {draft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-ambient">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-ink">{mode === "edit" ? "Edit event" : "Create event"}</h2>
                <p className="text-sm text-muted">Duration updates automatically from start/end or duration inputs.</p>
              </div>
              {draft.isFixed || !draft.canMove ? <StatusPill className="bg-lavender-100 text-lavender-700">protected</StatusPill> : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="text-sm font-bold text-muted">Title</span>
                <input className="soft-input mt-1 w-full" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </label>
              <label>
                <span className="text-sm font-bold text-muted">Date</span>
                <input className="soft-input mt-1 w-full" type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
              </label>
              <label>
                <span className="text-sm font-bold text-muted">Category</span>
                <select className="soft-input mt-1 w-full" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label>
                <span className="text-sm font-bold text-muted">Start</span>
                <input className="soft-input mt-1 w-full" type="time" value={draft.startTime} onChange={(event) => handleTimeChange({ startTime: event.target.value })} />
              </label>
              <label>
                <span className="text-sm font-bold text-muted">End</span>
                <input className="soft-input mt-1 w-full" type="time" value={draft.endTime} onChange={(event) => handleTimeChange({ endTime: event.target.value })} />
              </label>
              <label>
                <span className="text-sm font-bold text-muted">Duration hours</span>
                <input className="soft-input mt-1 w-full" min={0} type="number" value={durationHours} onChange={(event) => handleDurationChange(Number(event.target.value), durationMinutes)} />
              </label>
              <label>
                <span className="text-sm font-bold text-muted">Duration minutes</span>
                <input className="soft-input mt-1 w-full" min={0} max={55} step={5} type="number" value={durationMinutes} onChange={(event) => handleDurationChange(durationHours, Number(event.target.value))} />
              </label>
              <label>
                <span className="text-sm font-bold text-muted">Type</span>
                <select className="soft-input mt-1 w-full" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as EventType })}>
                  {eventTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label>
                <span className="text-sm font-bold text-muted">Priority</span>
                <select className="soft-input mt-1 w-full" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}>
                  <option>high</option>
                  <option>medium</option>
                  <option>low</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-2xl bg-sage-50 p-3 text-sm font-bold text-sage-900">
                <input type="checkbox" checked={draft.isFixed} onChange={(event) => setDraft({ ...draft, isFixed: event.target.checked, canMove: event.target.checked ? false : draft.canMove })} />
                Fixed event
              </label>
              <label className="flex items-center gap-2 rounded-2xl bg-sage-50 p-3 text-sm font-bold text-sage-900">
                <input type="checkbox" checked={draft.canMove} onChange={(event) => setDraft({ ...draft, canMove: event.target.checked, isFixed: event.target.checked ? draft.isFixed : true })} />
                Can move
              </label>
              <label className="md:col-span-2">
                <span className="text-sm font-bold text-muted">Notes</span>
                <textarea className="soft-input mt-1 min-h-24 w-full" value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-between gap-2">
              <div>
                {mode === "edit" && draft.id ? (
                  <Button variant="ghost" onClick={() => { deleteEvent(draft.id!); setDraft(null); }}>
                    Delete
                  </Button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
                <Button onClick={saveDraft}>{mode === "edit" ? "Save changes" : "Create event"}</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function colorForCategory(category: string) {
  if (category.includes("Japanese")) return "#4a6549";
  if (category.includes("Research")) return "#426276";
  if (category.includes("AI")) return "#61597f";
  if (category.includes("Health")) return "#8ba888";
  if (category.includes("Work")) return "#956044";
  return "#84a5ba";
}
