"use client";

import type { AppUsageDaily, AppUsageSample } from "@/lib/api";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Series colors live in globals.css so light/dark swap in one place.
const AVG = "var(--usage-avg)";
const PEAK = "var(--usage-peak)";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "12px",
} as const;

/** Bucket start (unix seconds) -> axis label, at a resolution the range warrants. */
export function formatBucket(t: number, bucketMinutes: number): string {
  const d = new Date(t * 1000);
  if (bucketMinutes >= 1440) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (bucketMinutes >= 360) {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
    });
  }
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDay(day: string): string {
  // Parse as UTC — the server buckets days in UTC.
  const d = new Date(`${day}T00:00:00Z`);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Keep the x-axis readable without dropping data: label ~8 ticks. */
function tickInterval(count: number): number {
  return Math.max(0, Math.ceil(count / 8) - 1);
}

export function ConcurrentUsersChart({
  samples,
  bucketMinutes,
  height = 260,
}: {
  samples: AppUsageSample[];
  bucketMinutes: number;
  height?: number;
}) {
  if (samples.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No samples yet — the server records one every 5 minutes.
      </div>
    );
  }

  const data = samples.map((s) => ({
    label: formatBucket(s.t, bucketMinutes),
    Average: s.avg,
    Peak: s.peak,
  }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="usageAvgFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={AVG} stopOpacity={0.28} />
              <stop offset="100%" stopColor={AVG} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            className="stroke-muted"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            interval={tickInterval(data.length)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            allowDecimals={false}
            width={36}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "var(--foreground)" }}
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
            formatter={(value) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="Average"
            stroke={AVG}
            strokeWidth={2}
            fill="url(#usageAvgFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
          <Line
            type="monotone"
            dataKey="Peak"
            stroke={PEAK}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyUsersChart({
  daily,
  height = 260,
}: {
  daily: AppUsageDaily[];
  height?: number;
}) {
  if (daily.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No daily data yet.
      </div>
    );
  }

  const data = daily.map((d) => ({
    label: formatDay(d.day),
    "Unique users": d.unique_users,
  }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            className="stroke-muted"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            interval={tickInterval(data.length)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            allowDecimals={false}
            width={36}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "var(--foreground)" }}
            cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
          />
          {/* Single series — the card title names it, so no legend box. */}
          <Bar dataKey="Unique users" fill={AVG} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
