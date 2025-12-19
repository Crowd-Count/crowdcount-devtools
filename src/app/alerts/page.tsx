"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Bell, AlertTriangle, PartyPopper, Shield, FileText, Leaf } from "lucide-react";
import { format } from "date-fns";

const alertTypes = [
  { value: "info", label: "Info", icon: Bell },
  { value: "warning", label: "Warning", icon: AlertTriangle },
  { value: "celebration", label: "Celebration", icon: PartyPopper },
  { value: "privacy", label: "Privacy", icon: Shield },
  { value: "terms-of-use", label: "Terms of Use", icon: FileText },
  { value: "leaf", label: "Leaf", icon: Leaf },
];

export default function AlertsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [alertType, setAlertType] = useState<string>("info");
  const [expiresIn, setExpiresIn] = useState("24"); // hours
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");

  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["allAlerts"],
    queryFn: () => api.getAllAlerts(),
  });

  const { data: activeAlert } = useQuery({
    queryKey: ["activeAlert"],
    queryFn: () => api.getActiveAlert(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let expiryDate: Date;

      if (useCustomDate && customDate && customTime) {
        expiryDate = new Date(`${customDate}T${customTime}`);
      } else if (useCustomDate && customDate) {
        expiryDate = new Date(`${customDate}T23:59:59`);
      } else {
        expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + parseInt(expiresIn));
      }

      return api.sendAlert({
        title,
        body,
        alert_type: alertType as "info" | "warning" | "celebration" | "privacy" | "terms-of-use" | "leaf",
        expires: format(expiryDate, "yyyy-MM-dd HH:mm:ss"),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAlerts"] });
      queryClient.invalidateQueries({ queryKey: ["activeAlert"] });
      toast.success("Alert created successfully");
      setIsOpen(false);
      setTitle("");
      setBody("");
      setAlertType("info");
      setExpiresIn("24");
      setUseCustomDate(false);
      setCustomDate("");
      setCustomTime("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const expireMutation = useMutation({
    mutationFn: (alertId: string) => api.expireAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAlerts"] });
      queryClient.invalidateQueries({ queryKey: ["activeAlert"] });
      toast.success("Alert expired");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const isExpired = (expiresStr: string | undefined) => {
    if (!expiresStr) return false;
    try {
      return new Date(expiresStr) < new Date();
    } catch {
      return false;
    }
  };

  const safeFormatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return format(date, "PPp");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Alerts</h2>
          <p className="text-muted-foreground">
            Manage system-wide alerts and notifications
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Alert title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Alert message content"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Alert Type</Label>
                <Select value={alertType} onValueChange={setAlertType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {alertTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="customDate">Use custom date/time</Label>
                  <Switch
                    id="customDate"
                    checked={useCustomDate}
                    onCheckedChange={setUseCustomDate}
                  />
                </div>
                {useCustomDate ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="expires">Expires In</Label>
                    <Select value={expiresIn} onValueChange={setExpiresIn}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="12">12 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="48">48 hours</SelectItem>
                        <SelectItem value="168">1 week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={!title || !body || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Alert"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {activeAlert && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Active Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{activeAlert.title}</span>
                <Badge>{activeAlert.alert_type}</Badge>
              </div>
              <p className="text-muted-foreground">{activeAlert.body}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : alerts && alerts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.alert_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {alert.body}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{alert.alert_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {safeFormatDate(alert.expires)}
                    </TableCell>
                    <TableCell>
                      {isExpired(alert.expires) ? (
                        <Badge variant="outline">Expired</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!isExpired(alert.expires) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => expireMutation.mutate(alert.alert_id)}
                          disabled={expireMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No alerts found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
