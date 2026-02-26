"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { StatusCheck } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useState, useMemo } from "react";

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
  // Show most recent 100 checks as small bars
  const visible = checks.slice(-100);
  if (visible.length === 0) {
    return <div className="text-sm text-muted-foreground">No data</div>;
  }

  return (
    <div className="flex gap-px items-end h-8">
      {visible.map((check, i) => (
        <div
          key={`${check.timestamp}-${i}`}
          className={`flex-1 min-w-[3px] max-w-[6px] rounded-sm ${
            check.status === "up" ? "bg-green-500" : "bg-red-500"
          }`}
          style={{ height: check.status === "up" ? "100%" : "100%" }}
          title={`${formatTimestamp(check.timestamp)} — ${check.status.toUpperCase()} (${check.latency_ms}ms)`}
        />
      ))}
    </div>
  );
}

export default function StatusPage() {
  const [hours, setHours] = useState("24");

  const { data, isLoading } = useQuery({
    queryKey: ["statusHistory", hours],
    queryFn: () => api.getStatusHistory(Number(hours)),
    refetchInterval: 60000, // refresh every minute
  });

  const checks = data?.checks ?? [];
  const latestCheck = checks.length > 0 ? checks[checks.length - 1] : null;
  const isUp = latestCheck?.status === "up";

  // Calculate uptime for different periods
  const uptimeStats = useMemo(() => {
    if (!checks.length) return { h24: null, d7: null, d30: null };

    const now = Date.now();
    const calc = (ms: number) => {
      const cutoff = new Date(now - ms).toISOString();
      const relevant = checks.filter((c) => c.timestamp >= cutoff);
      if (!relevant.length) return null;
      const up = relevant.filter((c) => c.status === "up").length;
      return Math.round((up / relevant.length) * 10000) / 100;
    };

    return {
      h24: calc(24 * 60 * 60 * 1000),
      d7: calc(7 * 24 * 60 * 60 * 1000),
      d30: data?.uptime_percent ?? null,
    };
  }, [checks, data?.uptime_percent]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Status</h1>
        <Select value={hours} onValueChange={setHours}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 1 hour</SelectItem>
            <SelectItem value="6">Last 6 hours</SelectItem>
            <SelectItem value="24">Last 24 hours</SelectItem>
            <SelectItem value="168">Last 7 days</SelectItem>
            <SelectItem value="720">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Current Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Status</CardTitle>
            {isUp ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : latestCheck ? (
              <>
                <div className={`text-2xl font-bold ${isUp ? "text-green-500" : "text-red-500"}`}>
                  {isUp ? "Operational" : "Down"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {latestCheck.latency_ms}ms — {timeAgo(latestCheck.timestamp)}
                </p>
              </>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uptimeStats.h24 !== null ? `${uptimeStats.h24}%` : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime (7d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uptimeStats.d7 !== null ? `${uptimeStats.d7}%` : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime (30d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uptimeStats.d30 !== null ? `${uptimeStats.d30}%` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Uptime Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-8 bg-muted animate-pulse rounded" />
          ) : (
            <>
              <UptimeBar checks={checks} />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{checks.length > 0 ? formatTimestamp(checks[0].timestamp) : ""}</span>
                <span>{checks.length > 0 ? formatTimestamp(checks[checks.length - 1].timestamp) : ""}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Checks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Recent Checks ({checks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : checks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No status checks recorded yet. The status checker runs every 5 minutes.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...checks]
                  .reverse()
                  .slice(0, 50)
                  .map((check, i) => (
                    <TableRow key={`${check.timestamp}-${i}`}>
                      <TableCell className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatTimestamp(check.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={check.status === "up" ? "default" : "destructive"}>
                          {check.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{check.latency_ms}ms</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {check.checked_url}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
