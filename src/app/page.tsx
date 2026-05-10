import { AppShell } from "@/components/AppShell";
import { TodayDashboard } from "@/components/TodayDashboard";

export default function Home() {
  return (
    <AppShell>
      <TodayDashboard />
    </AppShell>
  );
}
