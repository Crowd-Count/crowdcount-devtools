"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { setSessionExpiry, getSessionExpiry, clearSessionExpiry } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");


  // Clear any persisted password on mount
  useEffect(() => {
    localStorage.removeItem("crowdcount_admin_password");
  }, []);

  // Set session expiry timestamp on login
  useEffect(() => {
    if (isAuthenticated) {
      setSessionExpiry();
    }
  }, [isAuthenticated]);

  // Poll for session expiry every second
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const expiry = getSessionExpiry();
      if (expiry && Date.now() >= expiry) {
        setIsAuthenticated(false);
        api.setAdminPassword("");
        clearSessionExpiry();
        toast.error("Session expired. Please log in again.");
      }
    }, 1000);

    return () => clearInterval(interval);
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
