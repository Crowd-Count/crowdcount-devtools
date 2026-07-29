"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  ConcurrentUsersChart,
  DailyUsersChart,
  formatBucket,
} from "@/components/app-usage/usage-charts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Smartphone, TrendingUp, Users, CalendarDays } from "lucide-react";

/** Range presets. Wider ranges roll the stored 5-min rows up server-side. */
const RANGES = [
  { label: "24h", hours: 24, bucketMinutes: 5, refetchMs: 30_000 },
  { label: "7d", hours: 24 * 7, bucketMinutes: 60, refetchMs: 60_000 },
  { label: "30d", hours: 24 * 30, bucketMinutes: 360, refetchMs: 300_000 },
  { label: "90d", hours: 24 * 90, bucketMinutes: 1440, refetchMs: 300_000 },
] as const;

export default function AppUsagePage() {
  const [rangeIndex, setRangeIndex] = useState(0);
  const range = RANGES[rangeIndex];

  const { data, isLoading } = useQuery({
    queryKey: ["appUsageHistory", range.hours, range.bucketMinutes],
    queryFn: () => api.getAppUsageHistory(range.hours, range.bucketMinutes),
    refetchInterval: range.refetchMs,
  });

  const samples = data?.samples ?? [];
  const summary = data?.summary;

  // Peak/average across the *selected* range, not just the 24h summary.
  const rangePeak = samples.length
    ? Math.max(...samples.map((s) => s.peak))
    : null;
  const rangeAvg = samples.length
    ? Math.round((samples.reduce((sum, s) => sum + s.avg, 0) / samples.length) * 10) / 10
    : null;

  const stats = [
    {
      label: "Active now",
      value: summary?.current ?? "—",
      icon: Smartphone,
      hint: "Heartbeat in the last 60s",
    },
    {
      label: `Peak (${range.label})`,
      value: rangePeak ?? "—",
      icon: TrendingUp,
      hint: "Most concurrent users",
    },
    {
      label: `Average (${range.label})`,
      value: rangeAvg ?? "—",
      icon: Users,
      hint: "Mean concurrent users",
    },
    {
      label: "Unique today",
      value: summary?.dau_today ?? "—",
      icon: CalendarDays,
      hint:
        summary?.dau_7d_avg != null
          ? `7d average: ${summary.dau_7d_avg}`
          : "Distinct installs (UTC day)",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">App Usage</h1>
        <div className="flex gap-1">
          {RANGES.map((r, i) => (
            <Button
              key={r.label}
              variant={i === rangeIndex ? "default" : "outline"}
              size="sm"
              onClick={() => setRangeIndex(i)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold">
              {isLoading ? "..." : stat.value}
            </div>
            <p className="text-[11px] text-muted-foreground">{stat.hint}</p>
          </Card>
        ))}
      </div>

      <Card className="p-3">
        <p className="text-xs text-muted-foreground mb-2">
          Concurrent users — {range.label}
        </p>
        {isLoading ? (
          <div className="h-[260px] bg-muted animate-pulse rounded" />
        ) : (
          <ConcurrentUsersChart
            samples={samples}
            bucketMinutes={range.bucketMinutes}
          />
        )}
      </Card>

      <Card className="p-3">
        <p className="text-xs text-muted-foreground mb-2">
          Daily unique users — distinct app installs per UTC day
        </p>
        {isLoading ? (
          <div className="h-[260px] bg-muted animate-pulse rounded" />
        ) : (
          <DailyUsersChart daily={data?.daily ?? []} />
        )}
      </Card>

      <Card className="p-3">
        <p className="text-xs text-muted-foreground mb-2">
          Recent Samples ({samples.length})
        </p>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-4 text-sm">
            Loading...
          </div>
        ) : samples.length === 0 ? (
          <div className="text-center text-muted-foreground py-4 text-sm">
            No samples yet. The server records one every 5 minutes.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs h-8">Time</TableHead>
                <TableHead className="text-xs h-8">Average</TableHead>
                <TableHead className="text-xs h-8">Peak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...samples]
                .reverse()
                .slice(0, 50)
                .map((s) => (
                  <TableRow key={s.t}>
                    <TableCell className="py-1.5 text-xs">
                      {formatBucket(s.t, range.bucketMinutes)}
                    </TableCell>
                    <TableCell className="py-1.5 text-xs">{s.avg}</TableCell>
                    <TableCell className="py-1.5 text-xs">{s.peak}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
