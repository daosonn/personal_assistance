import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  eyebrow,
  description,
  actions
}: {
  title: string;
  eyebrow: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-sage-700">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted md:text-base">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      suppressHydrationWarning
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-sage-700 text-white hover:bg-sage-900",
        variant === "secondary" && "bg-white text-sage-900 shadow-sm hover:bg-sage-50",
        variant === "ghost" && "text-muted hover:bg-white/70 hover:text-ink",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "sage"
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  tone?: "sage" | "lavender" | "sky" | "peach";
}) {
  const toneClass = {
    sage: "bg-sage-50 text-sage-700",
    lavender: "bg-lavender-50 text-lavender-700",
    sky: "bg-skysoft-50 text-skysoft-700",
    peach: "bg-peach-50 text-peach-700"
  }[tone];

  return (
    <div className="planner-card p-5">
      <div className={clsx("mb-4 flex h-10 w-10 items-center justify-center rounded-2xl", toneClass)}>
        <Icon size={20} />
      </div>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{helper}</p>
    </div>
  );
}

export function StatusPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", className)}>
      {children}
    </span>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-sage-200 bg-white/50 p-8 text-center">
      <p className="font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}
