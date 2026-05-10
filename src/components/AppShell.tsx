"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BrainCircuit, CalendarDays, CheckCircle2, PanelLeft, Sparkles } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "Today", icon: CheckCircle2 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/review", label: "Review", icon: BarChart3 },
  { href: "/ai-traces", label: "AI Traces", icon: BrainCircuit }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 p-4 lg:block">
        <div className="flex h-full flex-col justify-between rounded-3xl border border-white/70 bg-white/70 p-4 shadow-ambient backdrop-blur-xl">
          <div>
            <div className="mb-8 flex items-center gap-3 px-2 pt-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage-700 text-white">
                <Sparkles size={21} />
              </div>
              <div>
                <p className="text-base font-bold text-ink">daoson&apos;s plan</p>
                <p className="text-xs font-medium text-muted">AI planning lab</p>
              </div>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      active
                        ? "bg-sage-700 text-white shadow-sm"
                        : "text-muted hover:bg-sage-50 hover:text-sage-900"
                    )}
                  >
                    <Icon size={19} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="rounded-2xl bg-sage-50 p-4 text-sm text-sage-900">
            <p className="font-semibold">Working day reset</p>
            <p className="mt-1 text-xs leading-5 text-sage-700">Plans reset at 05:00, while the calendar still shows the full 24-hour day.</p>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-10 border-b border-white/70 bg-surface/80 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <PanelLeft size={20} />
            daoson&apos;s plan
          </div>
          <div className="flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  aria-label={item.label}
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "rounded-xl p-2",
                    active ? "bg-sage-700 text-white" : "bg-white/70 text-muted"
                  )}
                >
                  <Icon size={18} />
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="px-4 py-6 lg:ml-72 lg:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
