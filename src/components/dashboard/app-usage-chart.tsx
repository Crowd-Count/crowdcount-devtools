"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { ConcurrentUsersChart } from "@/components/app-usage/usage-charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";

export function AppUsageChart() {
  const { hasPermission } = useAdmin();
  const canView = hasPermission("devices");

  const { data, isLoading } = useQuery({
    queryKey: ["appUsageHistory", 24, 5],
    queryFn: () => api.getAppUsageHistory(24, 5),
    enabled: canView,
  });

  // /app_usage_history is gated on the "devices" permission server-side.
  if (!canView) return null;

  const summary = data?.summary;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            App Users
          </CardTitle>
          <CardDescription>Concurrent users over the last 24 hours</CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 text-right">
            <div>
              <div className="text-xl font-bold">{summary?.current ?? "-"}</div>
              <p className="text-[11px] text-muted-foreground">Now</p>
            </div>
            <div>
              <div className="text-xl font-bold">{summary?.peak_24h ?? "-"}</div>
              <p className="text-[11px] text-muted-foreground">24h peak</p>
            </div>
            <div>
              <div className="text-xl font-bold">{summary?.dau_today ?? "-"}</div>
              <p className="text-[11px] text-muted-foreground">Today</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/app-usage">
              Details
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[220px] bg-muted animate-pulse rounded" />
        ) : (
          <ConcurrentUsersChart
            samples={data?.samples ?? []}
            bucketMinutes={5}
            height={220}
          />
        )}
      </CardContent>
    </Card>
  );
}
