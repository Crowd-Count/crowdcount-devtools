"use client";

import { useState, useEffect } from "react";
import { api, getApiEnv, setApiEnv, API_ENVIRONMENTS, type ApiEnv } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { setSessionExpiry, getSessionExpiry, clearSessionExpiry } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { WifiOff, RefreshCw, Server } from "lucide-react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");
  const [isRetrying, setIsRetrying] = useState(false);
  const { setAdmin, clearAdmin } = useAdmin();

  // Check server connectivity on mount
  useEffect(() => {
    checkServer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkServer() {
    setServerStatus("checking");
    try {
      await api.ping();
      setServerStatus("online");
    } catch {
      setServerStatus("offline");
    }
  }

  async function handleRetry() {
    setIsRetrying(true);
    try {
      await api.ping();
      setServerStatus("online");
    } catch {
      setServerStatus("offline");
    }
    setIsRetrying(false);
  }

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
    // Server offline or checking
    if (serverStatus !== "online") {
      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <WifiOff className="h-10 w-10 text-muted-foreground" />
              </div>
              <CardTitle>
                {serverStatus === "checking" ? "Connecting..." : "Can't Connect to Server"}
              </CardTitle>
              <CardDescription>
                {serverStatus === "checking"
                  ? "Checking server availability..."
                  : "The CrowdCount API server is unreachable. This could be due to a network issue or server maintenance."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {serverStatus === "offline" && (
                <div className="flex justify-center">
                  <Button onClick={handleRetry} disabled={isRetrying} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`} />
                    {isRetrying ? "Retrying..." : "Retry"}
                  </Button>
                </div>
              )}
              <div className={serverStatus === "offline" ? "pt-4 border-t" : ""}>
                <div className="flex items-center gap-2 mb-2">
                  <Server className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">API Environment</span>
                </div>
                <div className="flex gap-2">
                  {(Object.keys(API_ENVIRONMENTS) as ApiEnv[]).map((env) => (
                    <Button
                      key={env}
                      variant={getApiEnv() === env ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (env !== getApiEnv()) {
                          setApiEnv(env);
                        }
                      }}
                      className="flex-1 capitalize text-xs"
                    >
                      {env}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

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
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">API Environment</span>
              </div>
              <div className="flex gap-2">
                {(Object.keys(API_ENVIRONMENTS) as ApiEnv[]).map((env) => (
                  <Button
                    key={env}
                    variant={getApiEnv() === env ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (env !== getApiEnv()) {
                        setApiEnv(env);
                      }
                    }}
                    className="flex-1 capitalize text-xs"
                  >
                    {env}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
