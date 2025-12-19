"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, MapPin, Cpu, MessageSquare, Plus } from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      title: "Create Alert",
      description: "Send a new system-wide alert",
      href: "/alerts?action=create",
      icon: Bell,
    },
    {
      title: "Add Location",
      description: "Register a new location on the map",
      href: "/locations?action=create",
      icon: MapPin,
    },
    {
      title: "Create Device",
      description: "Generate new device credentials",
      href: "/devices?action=create",
      icon: Cpu,
    },
    {
      title: "View Reports",
      description: "Check pending user reports",
      href: "/reports",
      icon: MessageSquare,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {actions.map((action) => (
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
