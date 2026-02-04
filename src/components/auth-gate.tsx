"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any persisted password on mount
  useEffect(() => {
    localStorage.removeItem("crowdcount_admin_password");
  }, []);

  // Set up session timeout
  useEffect(() => {
    if (isAuthenticated) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        setIsAuthenticated(false);
        api.setAdminPassword("");
        toast.error("Session expired. Please log in again.");
      }, SESSION_TIMEOUT_MS);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [isAuthenticated]);

  async function verifyPassword(pwd: string) {
    setIsLoading(true);
    try {
      const valid = await api.checkAdminPassword(pwd);
      if (valid) {
        api.setAdminPassword(pwd);
        setIsAuthenticated(true);
        toast.success("Logged in successfully");
      } else {
        toast.error("Invalid admin password");
      }
    } catch (error) {
      toast.error("Failed to connect to API");
    }
    setIsLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await verifyPassword(password);
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>CrowdCount DevTools</CardTitle>
            <CardDescription>
              Enter your admin password to access the developer panel.
              Session expires after 30 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Admin Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
