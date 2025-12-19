"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");

  useEffect(() => {
    const savedPassword = localStorage.getItem("crowdcount_admin_password");
    if (savedPassword) {
      api.setAdminPassword(savedPassword);
      verifyPassword(savedPassword);
    } else {
      setIsLoading(false);
    }
  }, []);

  async function verifyPassword(pwd: string) {
    setIsLoading(true);
    try {
      const valid = await api.checkAdminPassword(pwd);
      if (valid) {
        api.setAdminPassword(pwd);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("crowdcount_admin_password");
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Connecting...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>CrowdCount DevTools</CardTitle>
            <CardDescription>
              Enter your admin password to access the developer panel
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
                />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
