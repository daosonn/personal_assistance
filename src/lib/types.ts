export type Priority = "high" | "medium" | "low";
export type TaskStatus =
  | "pending"
  | "planned"
  | "in_progress"
  | "done"
  | "postponed"
  | "missed"
  | "cancelled";

export type EventType =
  | "task"
  | "fixed"
  | "focus"
  | "event"
  | "deadline"
  | "break"
  | "review"
  | "routine";

export type PlanStatus = "draft" | "ready" | "approved" | "needs_review" | "failed";
export type Source = "web" | "telegram" | "ai" | "n8n" | "mock";

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: Priority;
  status: TaskStatus;
  estimatedMinutes: number;
  deadline?: string;
  preferredDate?: string;
  preferredTime?: string;
  source: Source;
  isFixed: boolean;
  canMove: boolean;
  important: boolean;
  urgent: boolean;
  scheduledEventId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  category: string;
  type: EventType;
  priority: Priority;
  status: TaskStatus;
  source: Source;
  isFixed: boolean;
  canMove: boolean;
  taskId?: string;
  notes?: string;
}

export interface PlannedItem {
  task_id: string;
  title: string;
  start_time: string;
  end_time: string;
  category: string;
  priority: Priority;
  reason: string;
}

export interface FixedBlock {
  event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export interface DailyPlan {
  id: string;
  date: string;
  status: PlanStatus;
  summary: string;
  aiInsights: string[];
  fixedBlocks: FixedBlock[];
  plannedItems: PlannedItem[];
  breaks: Array<{ start_time: string; end_time: string; reason: string }>;
  unscheduled: Array<{ task_id: string; title: string; reason: string }>;
  warnings: string[];
  suggestions: string[];
  createdBy: "ai" | "user" | "mock";
  approvedAt?: string;
  createdAt: string;
}

export interface CategorySummary {
  category: string;
  totalMinutes: number;
  completedItems: string[];
  insight: string;
  suggestion: string;
}

export interface DailyReview {
  id: string;
  date: string;
  mood: "great" | "good" | "normal" | "tired" | "bad";
  energyLevel: number;
  completionRate: number;
  focusMinutes: number;
  learningScore: number;
  productivityScore: number;
  aiSummary: string;
  categorySummaries: CategorySummary[];
  completedTasks: string[];
  postponedTasks: string[];
  missedTasks: string[];
  userFeedback: {
    notes: string;
    wentWell: string;
    improve: string;
    deferredReason: string;
    bestFocusWindow: string;
    aiPlanningNote: string;
  };
  tomorrowTasks: Task[];
}

export interface UserSettings {
  dayResetTime: "05:00";
  defaultReminderBeforeMinutes: number;
  wakeTime: string;
  sleepTime: string;
  preferredFocusTime: string;
  maxDeepWorkMinutes: number;
  minBreakMinutes: number;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface PlannerStateSnapshot {
  tasks: Task[];
  events: CalendarEvent[];
  plans: DailyPlan[];
  reviews: DailyReview[];
  settings: UserSettings;
}

export type AITraceProvider = "deepseek" | "gemini" | "openai";
export type AITraceStatus = "success" | "error";

export interface AITraceUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  cacheMissInputTokens: number;
}

export interface AITraceCost {
  inputUsd: number;
  outputUsd: number;
  cacheHitUsd: number;
  cacheMissUsd: number;
  totalUsd: number;
  pricingNote: string;
}

export interface AITrace {
  id: string;
  createdAt: string;
  dayKey: string;
  operation: string;
  provider: AITraceProvider;
  model: string;
  status: AITraceStatus;
  latencyMs: number;
  system: string;
  prompt: string;
  requestPayload: unknown;
  rawResponse?: unknown;
  parsedData?: unknown;
  error?: string;
  usage: AITraceUsage;
  cost: AITraceCost;
}
