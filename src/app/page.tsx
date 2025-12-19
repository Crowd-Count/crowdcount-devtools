"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your CrowdCount system
        </p>
      </div>

      <StatsCards />

      <div className="grid gap-4 md:grid-cols-2">
        <QuickActions />
        <RecentActivity />
      </div>
    </div>
  );
}
