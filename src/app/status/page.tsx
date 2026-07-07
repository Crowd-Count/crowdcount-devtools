"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { StatusCheck } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Wifi, WifiOff } from "lucide-react";
import { useMemo } from "react";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function UptimeBar({ checks }: { checks: StatusCheck[] }) {
  const visible = checks;
  if (visible.length === 0) {
    return <div className="text-xs text-muted-foreground">No data</div>;
  }

  return (
    <div className="flex gap-px items-end h-6">
      {visible.map((check, i) => (
        <div
          key={`${check.timestamp}-${i}`}
          className={`flex-1 min-w-[2px] rounded-sm ${
            check.status === "up" ? "bg-green-500" : "bg-red-500"
          }`}
          style={{ height: "100%" }}
          title={`${formatTimestamp(check.timestamp)} — ${check.status.toUpperCase()} (${check.latency_ms}ms)`}
        />
      ))}
    </div>
  );
}

export default function StatusPage() {
  // Fetch 30d of data for uptime stat cards + timeline
  const {
    data: fullData,
    isLoading,
    // Stable per data refresh — used as "now" so render stays pure
    // (react-hooks/purity forbids Date.now() during render). The query
    // refetches every 60s, keeping it fresh enough for uptime windows.
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["statusHistory", "720"],
    queryFn: () => api.getStatusHistory(720),
    refetchInterval: 60000,
  });

  const allChecks = fullData?.checks ?? [];

  // Timeline bar: last 12 hours only
  const twelveHoursAgo = dataUpdatedAt - 12 * 60 * 60 * 1000;
  const checks = allChecks.filter(
    (c) => new Date(c.timestamp).getTime() >= twelveHoursAgo
  );
  const latestCheck = checks.length > 0 ? checks[checks.length - 1] : null;
  const isUp = latestCheck?.status === "up";

  const uptimeStats = useMemo(() => {
    if (!allChecks.length) return { h24: null, d7: null, d30: null };

    const now = dataUpdatedAt;
    const calc = (ms: number) => {
      const cutoff = new Date(now - ms).toISOString();
      const relevant = allChecks.filter((c) => c.timestamp >= cutoff);
      if (!relevant.length) return null;
      const up = relevant.filter((c) => c.status === "up").length;
      return Math.round((up / relevant.length) * 10000) / 100;
    };

    return {
      h24: calc(24 * 60 * 60 * 1000),
      d7: calc(7 * 24 * 60 * 60 * 1000),
      d30: fullData?.uptime_percent ?? null,
    };
  }, [allChecks, dataUpdatedAt, fullData?.uptime_percent]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Status</h1>

      {/* Status + Uptime row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Status</span>
            {isUp ? (
              <Wifi className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-red-500" />
            )}
          </div>
          {isLoading ? (
            <div className="text-lg font-semibold text-muted-foreground">...</div>
          ) : latestCheck ? (
            <>
              <div className={`text-lg font-semibold ${isUp ? "text-green-500" : "text-red-500"}`}>
                {isUp ? "Operational" : "Down"}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {latestCheck.latency_ms}ms - {timeAgo(latestCheck.timestamp)}
              </p>
            </>
          ) : (
            <div className="text-lg font-semibold text-muted-foreground">No data</div>
          )}
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">24h</span>
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-lg font-semibold">
            {uptimeStats.h24 !== null ? `${uptimeStats.h24}%` : "—"}
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">7d</span>
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-lg font-semibold">
            {uptimeStats.d7 !== null ? `${uptimeStats.d7}%` : "—"}
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">30d</span>
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-lg font-semibold">
            {uptimeStats.d30 !== null ? `${uptimeStats.d30}%` : "—"}
          </div>
        </Card>
      </div>

      {/* Timeline */}
      <Card className="p-3">
        <p className="text-xs text-muted-foreground mb-2">Last 12 Hours</p>
        {isLoading ? (
          <div className="h-6 bg-muted animate-pulse rounded" />
        ) : (
          <>
            <UptimeBar checks={checks} />
            <div className="flex justify-between mt-1 text-[11px] text-muted-foreground">
              <span>{checks.length > 0 ? formatTimestamp(checks[0].timestamp) : ""}</span>
              <span>{checks.length > 0 ? formatTimestamp(checks[checks.length - 1].timestamp) : ""}</span>
            </div>
          </>
        )}
      </Card>

      {/* Recent Checks */}
      <Card className="p-3">
        <p className="text-xs text-muted-foreground mb-2">
          Recent Checks ({checks.length})
        </p>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-4 text-sm">Loading...</div>
        ) : checks.length === 0 ? (
          <div className="text-center text-muted-foreground py-4 text-sm">
            No checks yet. The status checker runs every 5 minutes.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs h-8">Time</TableHead>
                <TableHead className="text-xs h-8">Status</TableHead>
                <TableHead className="text-xs h-8">Latency</TableHead>
                <TableHead className="text-xs h-8">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...checks]
                .reverse()
                .slice(0, 50)
                .map((check, i) => (
                  <TableRow key={`${check.timestamp}-${i}`}>
                    <TableCell className="py-1.5 text-xs">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatTimestamp(check.timestamp)}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge
                        variant={check.status === "up" ? "default" : "destructive"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {check.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 text-xs">{check.latency_ms}ms</TableCell>
                    <TableCell className="py-1.5 text-muted-foreground text-[11px]">
                      {check.checked_url}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
