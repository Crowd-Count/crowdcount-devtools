"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Wifi,
  WifiOff,
  Users,
  Bell,
  MapPin,
  MessageSquare,
  Activity,
  CheckCircle2,
} from "lucide-react";

export function StatsCards() {
  const { data: activeApps } = useQuery({
    queryKey: ["activeApps"],
    queryFn: () => api.getActiveCount(),
  });

  const { data: totalDevices } = useQuery({
    queryKey: ["totalDevices"],
    queryFn: () => api.getDeviceCount(),
  });

  const { data: onlineDevices } = useQuery({
    queryKey: ["onlineDevices"],
    queryFn: () => api.getDeviceCount("online"),
  });

  const { data: offlineDevices } = useQuery({
    queryKey: ["offlineDevices"],
    queryFn: () => api.getDeviceCount("offline"),
  });

  const { data: totalCount } = useQuery({
    queryKey: ["totalCount"],
    queryFn: () => api.getTotalCount(),
  });

  const { data: activeAlert } = useQuery({
    queryKey: ["activeAlert"],
    queryFn: () => api.getActiveAlert(),
  });

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.getAllMapLocations(),
  });

  const { data: pendingReports } = useQuery({
    queryKey: ["pendingReports"],
    queryFn: () => api.getReportsByStatus("pending"),
  });

  const { data: pingResult } = useQuery({
    queryKey: ["apiPing"],
    queryFn: () => api.pingWithLatency(),
  });

  const { data: statusHistory } = useQuery({
    queryKey: ["statusHistory", "24"],
    queryFn: () => api.getStatusHistory(24),
  });

  const uptime24h = (() => {
    const checks = statusHistory?.checks;
    if (!checks?.length) return null;
    const up = checks.filter((c) => c.status === "up").length;
    return Math.round((up / checks.length) * 10000) / 100;
  })();

  const { data: versionData } = useQuery({
    queryKey: ["deviceVersions"],
    queryFn: () => api.getDeviceVersions(),
  });

  const updatedCount = (() => {
    if (!versionData?.target_commit_hash || !totalDevices) return undefined;
    const target = versionData.target_commit_hash.trim().toLowerCase();
    return Object.values(versionData.versions).filter(
      (v) => v.commit_hash?.toLowerCase().startsWith(target) || target.startsWith(v.commit_hash?.toLowerCase())
    ).length;
  })();

  const stats = [
    {
      title: "Active App Users",
      value: activeApps ?? "-",
      icon: Smartphone,
      description: "Users with active heartbeat",
    },
    {
      title: "Total Count",
      value: totalCount?.toLocaleString() ?? "-",
      icon: Users,
      description: "System-wide count",
    },
    {
      title: "Online Devices",
      value: onlineDevices ?? "-",
      icon: Wifi,
      description: `of ${totalDevices ?? 0} total`,
      badge: onlineDevices !== undefined && totalDevices !== undefined
        ? `${Math.round((onlineDevices / (totalDevices || 1)) * 100)}%`
        : undefined,
      badgeVariant: "default" as const,
    },
    {
      title: "Offline Devices",
      value: offlineDevices ?? "-",
      icon: WifiOff,
      description: "Devices not reporting",
      badge: offlineDevices && offlineDevices > 0 ? "Attention" : undefined,
      badgeVariant: "destructive" as const,
    },
    {
      title: "Counters Updated",
      value: updatedCount !== undefined ? `${updatedCount}/${totalDevices}` : "-",
      icon: CheckCircle2,
      description: "Running target version",
      badge: updatedCount !== undefined && totalDevices !== undefined && updatedCount < totalDevices
        ? `${totalDevices - updatedCount} outdated`
        : updatedCount === totalDevices ? "All updated" : undefined,
      badgeVariant: (updatedCount !== undefined && totalDevices !== undefined && updatedCount < totalDevices
        ? "destructive" : "default") as "default" | "destructive" | "secondary",
    },
    {
      title: "Active Alert",
      value: activeAlert ? "1" : "0",
      icon: Bell,
      description: activeAlert?.title || "No active alerts",
      badge: activeAlert ? activeAlert.alert_type : undefined,
      badgeVariant: "secondary" as const,
    },
    {
      title: "Locations",
      value: locations?.length ?? "-",
      icon: MapPin,
      description: "Registered locations",
    },
    {
      title: "Pending Reports",
      value: pendingReports?.length ?? "-",
      icon: MessageSquare,
      description: "Awaiting review",
      badge: pendingReports && pendingReports.length > 0 ? "New" : undefined,
      badgeVariant: "destructive" as const,
    },
    {
      title: "API Status",
      value: pingResult ? `${pingResult.latencyMs}ms` : "-",
      icon: Activity,
      description: uptime24h !== null ? `24h uptime: ${uptime24h}%` : "Server response time",
      badge: pingResult ? "Online" : undefined,
      badgeVariant: (uptime24h !== null && uptime24h < 99 ? "destructive" : "default") as "default" | "destructive",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.badge && (
                <Badge variant={stat.badgeVariant}>{stat.badge}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
