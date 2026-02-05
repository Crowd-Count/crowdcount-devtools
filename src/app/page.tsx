"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Type,
  Megaphone,
  Clock,
  Check,
  DollarSign,
  MousePointerClick,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

export default function DashboardPage() {
  // Fetch today's login text
  const { data: todayText } = useQuery({
    queryKey: ["todayLoginText"],
    queryFn: () => api.getTodayLoginText(),
  });

  // Fetch ad stats
  const { data: adStats } = useQuery({
    queryKey: ["adStats"],
    queryFn: () => api.getAdStats(),
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your CrowdCount system
        </p>
      </div>

      <StatsCards />

      {/* Login Text & Ads Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's Login Text Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Today&apos;s Login Text
              </CardTitle>
              <CardDescription>
                {format(new Date(), "EEEE, MMMM d")}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login-texts">
                Manage
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {todayText?.text ? (
              <div className="space-y-2">
                <p className="text-lg font-medium italic">&quot;{todayText.text}&quot;</p>
                <Badge variant={todayText.is_override ? "default" : "secondary"}>
                  {todayText.is_override ? "Manual Override" : "From Pool"}
                </Badge>
              </div>
            ) : todayText ? (
              <p className="text-muted-foreground">Not selected yet</p>
            ) : (
              <p className="text-muted-foreground">No text set for today</p>
            )}
          </CardContent>
        </Card>

        {/* Ads Summary Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Ads Overview
              </CardTitle>
              <CardDescription>Advertisement statistics</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ads">
                Manage
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-2xl font-bold text-orange-600">
                    {adStats?.pending_review || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold text-green-600">
                    {adStats?.active || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold text-green-600">
                    {adStats?.total_revenue?.toFixed(0) || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <MousePointerClick className="h-4 w-4 text-blue-500" />
                  <span className="text-2xl font-bold text-blue-600">
                    {adStats?.total_clicks || 0}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <QuickActions />
        <RecentActivity />
      </div>
    </div>
  );
}
