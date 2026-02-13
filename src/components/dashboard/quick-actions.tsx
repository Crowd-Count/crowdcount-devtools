"use client";

import Link from "next/link";
import { useAdmin } from "@/lib/admin-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, MapPin, Cpu, MessageSquare } from "lucide-react";

export function QuickActions() {
  const { hasPermission } = useAdmin();

  const actions = [
    {
      title: "Create Alert",
      description: "Send a new system-wide alert",
      href: "/alerts?action=create",
      icon: Bell,
      permission: "alerts",
    },
    {
      title: "Add Location",
      description: "Register a new location on the map",
      href: "/locations?action=create",
      icon: MapPin,
      permission: "locations",
    },
    {
      title: "Create Device",
      description: "Generate new device credentials",
      href: "/devices?action=create",
      icon: Cpu,
      permission: "devices",
    },
    {
      title: "View Reports",
      description: "Check pending user reports",
      href: "/reports",
      icon: MessageSquare,
      permission: "reports",
    },
  ];

  const visibleActions = actions.filter((a) => hasPermission(a.permission));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {visibleActions.map((action) => (
          <Link key={action.title} href={action.href}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
            >
              <action.icon className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">{action.title}</p>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
