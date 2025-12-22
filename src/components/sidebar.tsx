"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bell,
  MapPin,
  Cpu,
  MessageSquare,
  Megaphone,
  Type,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Locations", href: "/locations", icon: MapPin },
  { name: "Devices", href: "/devices", icon: Cpu },
  { name: "Reports", href: "/reports", icon: MessageSquare },
  { name: "Ads", href: "/ads", icon: Megaphone },
  { name: "Login Texts", href: "/login-texts", icon: Type },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-card border-r transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center border-b px-4 justify-between">
        {!collapsed && (
          <>
            <h1 className="text-xl font-bold">CrowdCount</h1>
            <span className="ml-2 text-xs text-muted-foreground">DevTools</span>
          </>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors",
            collapsed && "mx-auto"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
      <nav className={cn("flex-1 space-y-1 p-4", collapsed && "px-2")}>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">
            API: {process.env.NEXT_PUBLIC_API_URL || "localhost:8080"}
          </p>
        </div>
      )}
    </div>
  );
}
