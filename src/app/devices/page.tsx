"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Wifi, WifiOff, Copy, Cpu, UserPlus, CheckCircle2, Save } from "lucide-react";
import type { Device } from "@/lib/types";

export default function DevicesPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [createCount, setCreateCount] = useState("1");
  const [createdUsers, setCreatedUsers] = useState<{ device_id: string; user_id?: string; password: string }[]>([]);
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");
  const [customDeviceId, setCustomDeviceId] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [createMode, setCreateMode] = useState<"auto" | "custom">("auto");
  const [targetHashInput, setTargetHashInput] = useState("");
  const [targetHashDirty, setTargetHashDirty] = useState(false);

  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useQuery({
    queryKey: ["allDevices"],
    queryFn: () => api.getAllDevices(),
  });

  const { data: versionData } = useQuery({
    queryKey: ["deviceVersions"],
    queryFn: () => api.getDeviceVersions(),
  });

  const setTargetMutation = useMutation({
    mutationFn: (hash: string) => api.setTargetVersion(hash),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deviceVersions"] });
      setTargetHashDirty(false);
      toast.success("Target version updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: () => api.createUsers(parseInt(createCount)),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allDevices"] });
      queryClient.invalidateQueries({ queryKey: ["totalDevices"] });
      setCreatedUsers(data.users || []);
      toast.success(`Created ${data.users?.length || 0} user(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createCustomMutation = useMutation({
    mutationFn: () => api.createDeviceWithCredentials(customDeviceId, customPassword),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allDevices"] });
      queryClient.invalidateQueries({ queryKey: ["totalDevices"] });
      setCreatedUsers([{ device_id: data.device_id, password: customPassword }]);
      setCustomDeviceId("");
      setCustomPassword("");
      toast.success(`Device "${data.device_id}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allDevices"] });
      queryClient.invalidateQueries({ queryKey: ["totalDevices"] });
      toast.success("Device deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "online" | "offline" }) =>
      api.setDeviceStatus(userId, status),
    onSuccess: (_, { userId, status }) => {
      queryClient.invalidateQueries({ queryKey: ["allDevices"] });
      toast.success(`${userId} set to ${status}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Merge version data into devices
  const targetHash = versionData?.target_commit_hash ?? null;
  const versions = versionData?.versions ?? {};

  const devicesWithVersions: Device[] | undefined = devices?.map((d) => {
    const ver = versions[d.device_id];
    const commitHash = ver?.commit_hash ?? null;
    // If target is set: updated only if hash matches; otherwise not updated
    // If no target set: all show as not updated
    const isUpdated = commitHash && targetHash ? commitHash === targetHash : false;
    return { ...d, commit_hash: commitHash, is_updated: isUpdated };
  });

  const filteredDevices = devicesWithVersions?.filter((device) => {
    if (filter === "all") return true;
    return device.status === filter;
  });

  const onlineCount = devices?.filter((d) => d.status === "online").length || 0;
  const offlineCount = devices?.filter((d) => d.status === "offline").length || 0;

  // Version stats
  const updatedCount = devicesWithVersions?.filter((d) => d.is_updated === true).length || 0;
  const outdatedCount = devicesWithVersions?.filter((d) => d.is_updated === false).length || 0;

  // Initialize target hash input from server data
  const displayTargetHash = targetHashDirty ? targetHashInput : (targetHash || "");

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Devices</h2>
          <p className="text-muted-foreground">
            Manage counting devices and credentials
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setCreatedUsers([]);
            setCustomDeviceId("");
            setCustomPassword("");
            setCreateMode("auto");
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Device</DialogTitle>
            </DialogHeader>
            {createdUsers.length > 0 ? (
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Save these credentials - passwords cannot be retrieved later!
                </p>
                <div className="space-y-2 max-h-[300px] overflow-auto">
                  {createdUsers.map((user) => (
                    <div
                      key={user.device_id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-mono font-medium">{user.device_id}</p>
                        <p className="font-mono text-sm text-muted-foreground">
                          {user.password}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          copyToClipboard(`${user.device_id}:${user.password}`)
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    const text = createdUsers
                      .map((u) => `${u.device_id}:${u.password}`)
                      .join("\n");
                    copyToClipboard(text);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy All
                </Button>
                <Button className="w-full" onClick={() => setIsOpen(false)}>
                  Done
                </Button>
              </div>
            ) : (
              <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as "auto" | "custom")} className="pt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="auto">Auto-Generate</TabsTrigger>
                  <TabsTrigger value="custom">Custom Credentials</TabsTrigger>
                </TabsList>
                <TabsContent value="auto" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="count">Number of devices to create</Label>
                    <Select value={createCount} onValueChange={setCreateCount}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 5, 10, 25, 50].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} device{n > 1 ? "s" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating..." : "Create Devices"}
                  </Button>
                </TabsContent>
                <TabsContent value="custom" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="deviceId">Device ID</Label>
                    <Input
                      id="deviceId"
                      placeholder="e.g., MainEntrance, Lobby1"
                      value={customDeviceId}
                      onChange={(e) => setCustomDeviceId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="devicePassword">Password</Label>
                    <Input
                      id="devicePassword"
                      type="password"
                      placeholder="Device password"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createCustomMutation.mutate()}
                    disabled={createCustomMutation.isPending || !customDeviceId || !customPassword}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {createCustomMutation.isPending ? "Creating..." : "Create Device"}
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Target Version */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Target Version</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              className="font-mono text-sm"
              placeholder="Enter target commit hash..."
              value={displayTargetHash}
              onChange={(e) => {
                setTargetHashInput(e.target.value);
                setTargetHashDirty(true);
              }}
            />
            <Button
              size="sm"
              disabled={!targetHashDirty || setTargetMutation.isPending}
              onClick={() => setTargetMutation.mutate(targetHashInput)}
            >
              <Save className="mr-1 h-3 w-3" />
              {setTargetMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
          {targetHash && !targetHashDirty && (
            <p className="text-xs text-muted-foreground mt-1">
              Current target: <code>{targetHash}</code>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onlineCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <WifiOff className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{offlineCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Updated</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {updatedCount}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {devices?.length || 0}
              </span>
            </div>
            {outdatedCount > 0 && (
              <p className="text-xs text-orange-500">{outdatedCount} not updated</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Devices</CardTitle>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="online">Online only</SelectItem>
                <SelectItem value="offline">Offline only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filteredDevices && filteredDevices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((device) => (
                  <TableRow key={device.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-medium">{device.user_id}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(device.user_id || "")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={device.status === "online" ? "default" : "secondary"}
                        className={`cursor-pointer transition-colors ${
                          device.status === "online"
                            ? "bg-green-500 hover:bg-green-600"
                            : "hover:bg-muted-foreground/20"
                        }`}
                        onClick={() =>
                          statusMutation.mutate({
                            userId: device.user_id || "",
                            status: device.status === "online" ? "offline" : "online",
                          })
                        }
                        title={`Click to set ${device.status === "online" ? "offline" : "online"}`}
                      >
                        {device.status === "online" ? (
                          <Wifi className="mr-1 h-3 w-3" />
                        ) : (
                          <WifiOff className="mr-1 h-3 w-3" />
                        )}
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {device.is_updated ? (
                        <Badge className="bg-green-500 hover:bg-green-600">Updated</Badge>
                      ) : (
                        <Badge variant="outline" className="border-orange-400 text-orange-500" title={device.commit_hash || "No version reported"}>
                          Not Updated
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(device.user_id || "")}
                        disabled={
                          deleteMutation.isPending ||
                          device.user_id === "Admin" ||
                          device.user_id === "Demo"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Cpu className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No devices found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsOpen(true)}>
                Create your first device
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
