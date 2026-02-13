"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/lib/admin-context";
import { getSessionExpiry } from "@/lib/session";
import {
  LayoutDashboard,
  Bell,
  MapPin,
  LayoutGrid,
  Cpu,
  MessageSquare,
  Megaphone,
  Type,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { getApiEnv, API_ENVIRONMENTS } from "@/lib/api";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, permission: null },
  { name: "Alerts", href: "/alerts", icon: Bell, permission: "alerts" },
  { name: "Map Locations", href: "/locations", icon: MapPin, permission: "locations" },
  { name: "Counter Locations", href: "/counter-locations", icon: LayoutGrid, permission: "locations" },
  { name: "Devices", href: "/devices", icon: Cpu, permission: "devices" },
  { name: "Reports", href: "/reports", icon: MessageSquare, permission: "reports" },
  { name: "Ads", href: "/ads", icon: Megaphone, permission: "ads" },
  { name: "Login Texts", href: "/login-texts", icon: Type, permission: "login_texts" },
  { name: "Settings", href: "/settings", icon: Settings, permission: null },
];

function useSessionTimer() {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const expiry = getSessionExpiry();
      if (expiry) {
        setTimeLeft(Math.max(0, expiry - Date.now()));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (timeLeft === null) return null;

  const totalSeconds = Math.floor(timeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    formatted: `${minutes}:${seconds.toString().padStart(2, "0")}`,
    isLow: minutes < 5,
  };
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const timer = useSessionTimer();
  const { username, hasPermission } = useAdmin();

  const visibleNavigation = navigation.filter(
    (item) => item.permission === null || hasPermission(item.permission)
  );

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
        {visibleNavigation.map((item) => {
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
      <div className="border-t p-4">
        {timer && (
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs mb-2",
              timer.isLow ? "text-red-400" : "text-muted-foreground"
            )}
            title="Time until auto logout"
          >
            <Clock className="h-3 w-3 flex-shrink-0" />
            {!collapsed && <span>{timer.formatted}</span>}
          </div>
        )}
        {!collapsed && (
          <div className="space-y-1">
            {username && (
              <p className="text-xs text-muted-foreground">
                Admin: {username}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              API: {API_ENVIRONMENTS[getApiEnv()]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
