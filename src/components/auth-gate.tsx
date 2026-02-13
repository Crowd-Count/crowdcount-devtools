"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { setSessionExpiry, getSessionExpiry, clearSessionExpiry } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { setAdmin, clearAdmin } = useAdmin();

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
        api.setAdminCredentials("", "");
        clearAdmin();
        clearSessionExpiry();
        toast.error("Session expired. Please log in again.");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, clearAdmin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username) {
      toast.error("Username is required");
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.checkAdminLogin(username, password);
      if (result.valid) {
        api.setAdminCredentials(username, password);
        const perms = result.permissions || "all";
        setAdmin(username, perms);
        setIsAuthenticated(true);
        toast.success(`Logged in as ${username}`);
      } else {
        toast.error("Invalid credentials");
      }
    } catch {
      toast.error("Failed to connect to API");
    }
    setIsLoading(false);
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>CrowdCount DevTools</CardTitle>
            <CardDescription>
              Enter your credentials to access the developer panel.
              Session expires after 30 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  disabled={isLoading}
                  autoComplete="current-password"
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
