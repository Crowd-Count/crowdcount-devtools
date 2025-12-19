"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export function RecentActivity() {
  const { data: reports } = useQuery({
    queryKey: ["recentReports"],
    queryFn: () => api.getAllReports(),
  });

  const { data: alerts } = useQuery({
    queryKey: ["allAlerts"],
    queryFn: () => api.getAllAlerts(),
  });

  const recentReports = reports?.slice(0, 3) || [];
  const recentAlerts = alerts?.slice(0, 3) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentReports.length === 0 && recentAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {recentAlerts.map((alert) => (
              <div
                key={alert.alert_id}
                className="flex items-start justify-between border-b pb-3 last:border-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">Alert created</p>
                </div>
                <Badge variant="secondary">{alert.alert_type}</Badge>
              </div>
            ))}
            {recentReports.map((report) => (
              <div
                key={report.report_id}
                className="flex items-start justify-between border-b pb-3 last:border-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Report from {report.user_name || "Anonymous"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {report.location} -{" "}
                    {formatDistanceToNow(new Date(report.date), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Badge
                  variant={
                    report.report_status === "pending"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {report.report_status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
