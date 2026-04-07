"use client";

import { useState, useRef, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, ChevronDown, ChevronRight, LayoutGrid, Copy, Edit2, Trash2, RotateCcw, X, Search, Clock, BarChart3, Lightbulb, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { EnrichedLocation } from "@/lib/types";
import { LocationHistoryDialog } from "@/components/location-history-dialog";
import { LocationInsightsDialog } from "@/components/location-insights-dialog";

interface CounterEntry {
  id: string;
  label: string;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ALL_TIMEZONES = Intl.supportedValuesOf("timeZone");
const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

interface ClosingDayState {
  enabled: boolean;
  closeHour: string;
  closeMinute: string;
  openHour: string;
  openMinute: string;
}

const DEFAULT_CLOSING_DAY: ClosingDayState = {
  enabled: false,
  closeHour: "22",
  closeMinute: "0",
  openHour: "6",
  openMinute: "0",
};

function padTime(h: string, m: string): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseTime(time: string): [string, string] {
  const [h, m] = time.split(":");
  return [String(Number(h)), String(Number(m))];
}

function DeviceRow({ deviceId, label, count }: { deviceId: string; label: string; count: number }) {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (delta: number) => api.addToDeviceCount(deviceId, delta),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allLocationsEnriched"] });
      toast.success(`${deviceId}: count → ${data.new_count}`);
    },
    onError: (error: Error) => {
      toast.error(`${deviceId}: ${error.message}`);
    },
  });

  const subMutation = useMutation({
    mutationFn: (delta: number) => api.subFromDeviceCount(deviceId, delta),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allLocationsEnriched"] });
      toast.success(`${deviceId}: count → ${data.new_count}`);
    },
    onError: (error: Error) => {
      toast.error(`${deviceId}: ${error.message}`);
    },
  });

  const isPending = addMutation.isPending || subMutation.isPending;

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50">
      <Badge variant="secondary" className="text-xs font-mono">
        {deviceId}
      </Badge>
      {label && label !== "Counter" && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <span className="text-xs font-mono tabular-nums ml-2">{count}</span>
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => subMutation.mutate(1)}
          disabled={isPending}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => addMutation.mutate(1)}
          disabled={isPending}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function LocationRow({
  location,
  onEdit,
  onDelete,
}: {
  location: EnrichedLocation;
  onEdit: (location: EnrichedLocation) => void;
  onDelete: (location: EnrichedLocation) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [eraseDialogOpen, setEraseDialogOpen] = useState(false);
  const [eraseAllConfirmOpen, setEraseAllConfirmOpen] = useState(false);
  const [eraseStartDate, setEraseStartDate] = useState("");
  const [eraseEndDate, setEraseEndDate] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [resetHour, setResetHour] = useState("0");
  const [resetMinute, setResetMinute] = useState("0");
  const [resetTimezone, setResetTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [closingTimeOpen, setClosingTimeOpen] = useState(false);
  const [closingDays, setClosingDays] = useState<ClosingDayState[]>(
    Array.from({ length: 7 }, () => ({ ...DEFAULT_CLOSING_DAY }))
  );
  const [closingTimezone, setClosingTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const queryClient = useQueryClient();

  const adjustMutation = useMutation({
    mutationFn: (delta: number) => api.adjustLocationCount(location.location_id, delta),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allLocationsEnriched"] });
      toast.success(`${location.location_name || "Location"}: count → ${data.new_count}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const eraseMutation = useMutation({
    mutationFn: () => api.resetLocationAllData(location.location_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allLocationsEnriched"] });
      toast.success(`Erased all data for "${location.location_name || "Location"}"`);
    },
    onError: (error: Error) => {
      toast.error(`Erase failed: ${error.message}`);
    },
  });

  const eraseDateRangeMutation = useMutation({
    mutationFn: () => api.resetLocationDateRange(location.location_id, eraseStartDate, eraseEndDate),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allLocationsEnriched"] });
      toast.success(`Erased ${data.rows_deleted} rows from ${eraseStartDate} to ${eraseEndDate}`);
      setEraseDialogOpen(false);
      setEraseStartDate("");
      setEraseEndDate("");
    },
    onError: (error: Error) => {
      toast.error(`Erase failed: ${error.message}`);
    },
  });

  const deviceIds = location.devices.map((d) => d[0]);

  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ["resetSchedule", location.location_id],
    queryFn: () => api.getResetSchedule(location.location_id, deviceIds),
    enabled: resetDialogOpen,
  });

  const setScheduleMutation = useMutation({
    mutationFn: () =>
      api.setResetSchedule(
        location.location_id,
        deviceIds,
        Number(resetHour),
        Number(resetMinute),
        resetTimezone
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resetSchedule", location.location_id] });
      toast.success("Reset schedule saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to set schedule: ${error.message}`);
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: () => api.deleteResetSchedule(location.location_id, deviceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resetSchedule", location.location_id] });
      toast.success("Reset schedule removed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete schedule: ${error.message}`);
    },
  });

  // Sync form fields when schedule data loads
  const syncedRef = useRef(false);
  useEffect(() => {
    if (resetDialogOpen && schedule && !syncedRef.current) {
      syncedRef.current = true;
      setResetHour(String(schedule.reset_hour));
      setResetMinute(String(schedule.reset_minute));
      setResetTimezone(schedule.timezone);
    }
    if (!resetDialogOpen) {
      syncedRef.current = false;
    }
  }, [resetDialogOpen, schedule]);

  // ── Closing time schedule ──
  const { data: closingTime, isLoading: closingTimeLoading } = useQuery({
    queryKey: ["closingTime", location.location_id],
    queryFn: () => api.getClosingTime(location.location_id, deviceIds),
    enabled: closingTimeOpen,
  });

  const setClosingTimeMutation = useMutation({
    mutationFn: () => {
      const days = closingDays
        .map((d, i) => d.enabled ? {
          day_of_week: i,
          close_hour: Number(d.closeHour),
          close_minute: Number(d.closeMinute),
          open_hour: Number(d.openHour),
          open_minute: Number(d.openMinute),
        } : null)
        .filter((d): d is NonNullable<typeof d> => d !== null);
      return api.setClosingTime(location.location_id, deviceIds, closingTimezone, days);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["closingTime", location.location_id] });
      queryClient.invalidateQueries({ queryKey: ["allLocationsEnriched"] });
      toast.success("Operating hours saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to set operating hours: ${error.message}`);
    },
  });

  const deleteClosingTimeMutation = useMutation({
    mutationFn: () => api.deleteClosingTime(location.location_id, deviceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["closingTime", location.location_id] });
      queryClient.invalidateQueries({ queryKey: ["allLocationsEnriched"] });
      toast.success("Operating hours removed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete operating hours: ${error.message}`);
    },
  });

  const closingSyncedRef = useRef(false);
  useEffect(() => {
    if (closingTimeOpen && closingTime && !closingSyncedRef.current) {
      closingSyncedRef.current = true;
      const newDays = Array.from({ length: 7 }, () => ({ ...DEFAULT_CLOSING_DAY }));
      for (const day of closingTime.days) {
        newDays[day.day_of_week] = {
          enabled: true,
          closeHour: String(day.close_hour),
          closeMinute: String(day.close_minute),
          openHour: String(day.open_hour),
          openMinute: String(day.open_minute),
        };
      }
      setClosingDays(newDays);
      setClosingTimezone(closingTime.timezone);
    }
    if (!closingTimeOpen) {
      closingSyncedRef.current = false;
    }
  }, [closingTimeOpen, closingTime]);

  function updateClosingDay(index: number, updates: Partial<ClosingDayState>) {
    setClosingDays(prev => prev.map((d, i) => i === index ? { ...d, ...updates } : d));
  }

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            {location.devices.length > 0 ? (
              expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
            <span className="font-medium">
              {location.location_name || "Unnamed"}
            </span>
            {location.is_closed && (
              <Badge variant="outline" className="text-xs text-orange-500 border-orange-500/30 bg-orange-500/10">
                closed
              </Badge>
            )}
            {location.has_pos && (
              <Badge variant="outline" className="text-xs text-blue-500 border-blue-500/30 bg-blue-500/10">
                POS integrated
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <button
            className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(location.location_id);
              toast.success("Location ID copied");
            }}
            title={location.location_id}
          >
            {location.location_id.slice(0, 8)}...
            <Copy className="h-3 w-3" />
          </button>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            {location.is_auto ? (
              <Badge variant="outline" className="text-xs">auto</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">manual</Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          {location.on_map ? (
            <Badge className="text-xs bg-green-500/15 text-green-600 border-green-500/20">yes</Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">no</Badge>
          )}
        </TableCell>
        <TableCell>
          <span className="text-sm text-muted-foreground">
            {location.devices.length} device{location.devices.length !== 1 ? "s" : ""}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); adjustMutation.mutate(-1); }}
              disabled={adjustMutation.isPending}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="font-mono min-w-[2ch] text-center">{location.current_count}</span>
            {location.overcrowding_limit != null && (
              <span className="text-muted-foreground">
                / {location.overcrowding_limit}
              </span>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); adjustMutation.mutate(1); }}
              disabled={adjustMutation.isPending}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); onEdit(location); }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); setEraseDialogOpen(true); }}
              disabled={eraseMutation.isPending || eraseDateRangeMutation.isPending}
            >
              <RotateCcw className={`h-4 w-4 ${eraseMutation.isPending || eraseDateRangeMutation.isPending ? "animate-spin" : ""}`} />
            </Button>
            <Dialog open={eraseDialogOpen} onOpenChange={(open) => {
              setEraseDialogOpen(open);
              if (!open) { setEraseStartDate(""); setEraseEndDate(""); }
            }}>
              <DialogContent onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>Erase Data — {location.location_name || "Unnamed"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Erase location history for a specific date range.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Start Date</Label>
                        <Input
                          type="date"
                          value={eraseStartDate}
                          onChange={(e) => setEraseStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">End Date</Label>
                        <Input
                          type="date"
                          value={eraseEndDate}
                          onChange={(e) => setEraseEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={!eraseStartDate || !eraseEndDate || eraseStartDate > eraseEndDate || eraseDateRangeMutation.isPending}
                      onClick={() => eraseDateRangeMutation.mutate()}
                    >
                      {eraseDateRangeMutation.isPending ? "Erasing..." : "Erase Date Range"}
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Or erase <strong>all</strong> history data for this location. This cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={eraseMutation.isPending}
                      onClick={() => setEraseAllConfirmOpen(true)}
                    >
                      {eraseMutation.isPending ? "Erasing..." : "Erase All Data"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <AlertDialog open={eraseAllConfirmOpen} onOpenChange={setEraseAllConfirmOpen}>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Erase All Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently erase <strong>all</strong> location-level history data for <strong>{location.location_name || "this location"}</strong>. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setEraseAllConfirmOpen(false);
                      setEraseDialogOpen(false);
                      eraseMutation.mutate();
                    }}
                  >
                    Erase All Data
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); setHistoryOpen(true); }}
              title="History"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); setInsightsOpen(true); }}
              title="Insights"
            >
              <Lightbulb className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); setResetDialogOpen(true); }}
            >
              <Clock className="h-4 w-4" />
            </Button>
            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <DialogContent onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>Daily Reset Schedule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {scheduleLoading ? (
                    <p className="text-sm text-muted-foreground">Loading schedule...</p>
                  ) : (
                    <>
                      {schedule && schedule.last_reset_date && (
                        <p className="text-xs text-muted-foreground">
                          Last reset: {schedule.last_reset_date}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Hour (0-23)</Label>
                          <Select value={resetHour} onValueChange={setResetHour}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {String(i).padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Minute (0-59)</Label>
                          <Select value={resetMinute} onValueChange={setResetMinute}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 60 }, (_, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {String(i).padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Timezone</Label>
                        <Input
                          value={resetTimezone}
                          onChange={(e) => setResetTimezone(e.target.value)}
                          placeholder="e.g., America/New_York"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => setScheduleMutation.mutate()}
                          disabled={setScheduleMutation.isPending || !resetTimezone.trim()}
                        >
                          {setScheduleMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        {schedule && (
                          <Button
                            variant="destructive"
                            onClick={() => deleteScheduleMutation.mutate()}
                            disabled={deleteScheduleMutation.isPending}
                          >
                            {deleteScheduleMutation.isPending ? "Removing..." : "Remove Schedule"}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); setClosingTimeOpen(true); }}
              title="Operating Hours"
            >
              <Moon className="h-4 w-4" />
            </Button>
            <Dialog open={closingTimeOpen} onOpenChange={setClosingTimeOpen}>
              <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>Operating Hours</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {closingTimeLoading ? (
                    <p className="text-sm text-muted-foreground">Loading schedule...</p>
                  ) : (
                    <>
                      {closingTime && (closingTime.last_close_date || closingTime.last_open_date) && (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {closingTime.last_close_date && <p>Last closed: {closingTime.last_close_date}</p>}
                          {closingTime.last_open_date && <p>Last opened: {closingTime.last_open_date}</p>}
                        </div>
                      )}
                      <div className="space-y-2">
                        {DAY_NAMES.map((dayName, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Switch
                              checked={closingDays[i].enabled}
                              onCheckedChange={(checked) => updateClosingDay(i, { enabled: checked })}
                            />
                            <span className="text-sm font-medium w-8">{dayName}</span>
                            {closingDays[i].enabled ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Open</span>
                                <Input
                                  type="time"
                                  className="h-7 w-[100px] text-xs"
                                  value={padTime(closingDays[i].openHour, closingDays[i].openMinute)}
                                  onChange={(e) => {
                                    const [h, m] = parseTime(e.target.value);
                                    updateClosingDay(i, { openHour: h, openMinute: m });
                                  }}
                                  step={60}
                                />
                                <span className="text-xs text-muted-foreground">Close</span>
                                <Input
                                  type="time"
                                  className="h-7 w-[100px] text-xs"
                                  value={padTime(closingDays[i].closeHour, closingDays[i].closeMinute)}
                                  onChange={(e) => {
                                    const [h, m] = parseTime(e.target.value);
                                    updateClosingDay(i, { closeHour: h, closeMinute: m });
                                  }}
                                  step={60}
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Off</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Timezone</Label>
                        <Select value={closingTimezone} onValueChange={setClosingTimezone}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {ALL_TIMEZONES.map((tz) => (
                              <SelectItem key={tz} value={tz}>
                                {tz.replace(/_/g, " ")}{tz === LOCAL_TIMEZONE ? " (local)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => setClosingTimeMutation.mutate()}
                          disabled={setClosingTimeMutation.isPending || !closingTimezone.trim() || !closingDays.some(d => d.enabled)}
                        >
                          {setClosingTimeMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        {closingTime && (
                          <Button
                            variant="destructive"
                            onClick={() => deleteClosingTimeMutation.mutate()}
                            disabled={deleteClosingTimeMutation.isPending}
                          >
                            {deleteClosingTimeMutation.isPending ? "Removing..." : "Remove"}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <LocationHistoryDialog
              open={historyOpen}
              onOpenChange={setHistoryOpen}
              locationId={location.location_id}
              locationName={location.location_name || "Unnamed"}
              deviceIds={deviceIds}
            />
            <LocationInsightsDialog
              open={insightsOpen}
              onOpenChange={setInsightsOpen}
              locationId={location.location_id}
              locationName={location.location_name || "Unnamed"}
              deviceIds={deviceIds}
            />
            {!location.is_auto && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(location); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      {expanded && location.devices.length > 0 && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 py-2 px-8">
            <div className="space-y-1">
              {location.devices.map(([deviceId, label, count]) => (
                <DeviceRow key={deviceId} deviceId={deviceId} label={label} count={count} />
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function CounterLocationsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingLocation, setEditingLocation] = useState<EnrichedLocation | null>(null);
  const [name, setName] = useState("");
  const [overcrowdingLimit, setOvercrowdingLimit] = useState("");
  const [counters, setCounters] = useState<CounterEntry[]>([{ id: "", label: "" }]);
  const [searchQuery, setSearchQuery] = useState("");

  const queryClient = useQueryClient();

  const { data: locations, isLoading } = useQuery({
    queryKey: ["allLocationsEnriched"],
    queryFn: () => api.getAllLocationsEnriched(),
    refetchInterval: 5000,
  });

  const { data: allDevices } = useQuery({
    queryKey: ["allDevices"],
    queryFn: () => api.getAllDevices(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const validCounters = counters.filter((c) => c.id.trim() !== "");
      if (validCounters.length === 0) throw new Error("Add at least one counter");
      const deviceIds = validCounters.map((c) => c.id.trim());
      const deviceLabels: Record<string, string> = {};
      for (const c of validCounters) {
        if (c.label.trim()) {
          deviceLabels[c.id.trim()] = c.label.trim();
        }
      }
      return api.createLocationSimple(
        deviceIds,
        name,
        Object.keys(deviceLabels).length > 0 ? deviceLabels : undefined,
        overcrowdingLimit ? Number(overcrowdingLimit) : undefined,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allLocationsEnriched"] });
      toast.success("Location created");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingLocation) throw new Error("No location selected");

      const validCounters = counters.filter((c) => c.id.trim() !== "");
      if (validCounters.length === 0) throw new Error("Add at least one counter");

      const deviceIds = validCounters.map((c) => c.id.trim());
      const deviceLabels: Record<string, string> = {};
      for (const c of validCounters) {
        if (c.label.trim()) {
          deviceLabels[c.id.trim()] = c.label.trim();
        }
      }

      const metadataUpdates: Record<string, unknown> = {
        name,
        overcrowding_limit: overcrowdingLimit ? Number(overcrowdingLimit) : null,
      };

      // For auto-locations, only update metadata (no device changes)
      if (editingLocation.is_auto) {
        return api.updateLocation(
          editingLocation.location_id,
          editingLocation.devices.map((d) => d[0]),
          metadataUpdates,
        );
      }

      // Check if device set changed
      const oldDeviceIds = editingLocation.devices.map((d) => d[0]).sort();
      const newDeviceIds = [...deviceIds].sort();
      const devicesChanged =
        oldDeviceIds.length !== newDeviceIds.length ||
        oldDeviceIds.some((id, i) => id !== newDeviceIds[i]);

      if (devicesChanged) {
        return api.replaceLocation(
          editingLocation.location_id,
          deviceIds,
          Object.keys(deviceLabels).length > 0 ? deviceLabels : undefined,
          metadataUpdates,
        );
      } else {
        if (Object.keys(deviceLabels).length > 0) {
          metadataUpdates.device_labels = deviceLabels;
        }
        return api.updateLocation(
          editingLocation.location_id,
          deviceIds,
          metadataUpdates,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allLocationsEnriched"] });
      toast.success("Location updated");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (location: EnrichedLocation) =>
      api.deleteLocation(location.location_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allLocationsEnriched"] });
      toast.success("Location deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  function resetForm() {
    setIsOpen(false);
    setIsEditing(false);
    setEditingLocation(null);
    setName("");
    setOvercrowdingLimit("");
    setCounters([{ id: "", label: "" }]);
    setDeviceSearchQuery("");
  }

  function openEditDialog(location: EnrichedLocation) {
    setIsEditing(true);
    setEditingLocation(location);
    setName(location.location_name || "");
    setOvercrowdingLimit(location.overcrowding_limit != null ? String(location.overcrowding_limit) : "");
    setCounters(
      location.devices.length > 0
        ? location.devices.map((d) => ({ id: d[0], label: d[1] }))
        : [{ id: "", label: "" }]
    );
    setIsOpen(true);
  }

  function removeCounter(index: number) {
    const updated = counters.filter((_, i) => i !== index);
    setCounters(updated.length === 0 ? [{ id: "", label: "" }] : updated);
  }

  function updateCounter(index: number, field: "id" | "label", value: string) {
    const updated = [...counters];
    updated[index] = { ...updated[index], [field]: value };
    setCounters(updated);
  }

  const isAutoEdit = isEditing && editingLocation?.is_auto;
  const hasValidCounters = counters.some((c) => c.id.trim() !== "");
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");

  const selectedDeviceIds = new Set(counters.map((c) => c.id).filter(Boolean));
  const availableDevices = (allDevices ?? []).filter(
    (d) => !selectedDeviceIds.has(d.device_id)
  );
  const filteredAvailableDevices = availableDevices.filter((d) =>
    !deviceSearchQuery.trim() || d.device_id.toLowerCase().includes(deviceSearchQuery.toLowerCase())
  );

  const filteredLocations = (locations ?? []).filter((loc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (loc.location_name?.toLowerCase().includes(q)) return true;
    if (loc.location_id.toLowerCase().includes(q)) return true;
    return loc.devices.some(([deviceId, label]) =>
      deviceId.toLowerCase().includes(q) || label?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Counter Locations</h2>
          <p className="text-muted-foreground">
            All locations including auto-created and non-map locations. Click a row to expand devices.
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          else setIsOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Location" : "Create Location"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Location Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Main Library"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="overcrowdingLimit">Overcrowding Limit (optional)</Label>
                <Input
                  id="overcrowdingLimit"
                  type="number"
                  value={overcrowdingLimit}
                  onChange={(e) => setOvercrowdingLimit(e.target.value)}
                  placeholder="e.g., 100"
                />
              </div>

              {/* Counters Section */}
              <div className="space-y-3">
                <Label>Counters</Label>

                {isAutoEdit && (
                  <p className="text-xs text-muted-foreground">
                    Auto-location devices cannot be changed. Only name and limit can be edited.
                  </p>
                )}

                {/* Selected devices with label inputs */}
                {counters.filter((c) => c.id.trim()).length > 0 && (
                  <div className="space-y-2">
                    {counters.filter((c) => c.id.trim()).map((counter) => (
                      <div key={counter.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 p-3 border rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Device ID</Label>
                          <p className="text-sm font-mono pt-1">{counter.id}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Label (optional)</Label>
                          <Input
                            value={counter.label}
                            onChange={(e) => {
                              const idx = counters.findIndex((c) => c.id === counter.id);
                              if (idx !== -1) updateCounter(idx, "label", e.target.value);
                            }}
                            placeholder="e.g., Main Entrance"
                            disabled={!!isAutoEdit}
                          />
                        </div>
                        <div className="flex items-end">
                          {!isAutoEdit && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const idx = counters.findIndex((c) => c.id === counter.id);
                                if (idx !== -1) removeCounter(idx);
                              }}
                              className="h-9 w-9 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Device picker */}
                {!isAutoEdit && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <Label className="text-xs text-muted-foreground">Add devices</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search devices..."
                        value={deviceSearchQuery}
                        onChange={(e) => setDeviceSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {filteredAvailableDevices.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 text-center">
                          {availableDevices.length === 0 && (allDevices ?? []).length === 0
                            ? "No devices found. Create devices in the Devices tab first."
                            : availableDevices.length === 0
                              ? "All devices have been added."
                              : "No devices match your search."}
                        </p>
                      ) : (
                        filteredAvailableDevices.map((device) => (
                          <button
                            key={device.device_id}
                            type="button"
                            className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-accent text-sm font-mono"
                            onClick={() => {
                              setCounters((prev) => {
                                // Replace the empty placeholder if it exists, otherwise append
                                const hasEmptyPlaceholder = prev.length === 1 && prev[0].id.trim() === "";
                                if (hasEmptyPlaceholder) {
                                  return [{ id: device.device_id, label: "" }];
                                }
                                return [...prev, { id: device.device_id, label: "" }];
                              });
                            }}
                          >
                            <Plus className="h-3 w-3 text-muted-foreground" />
                            {device.device_id}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {!isAutoEdit && counters.filter((c) => c.id.trim()).length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {counters.filter((c) => c.id.trim()).length} counters total. Counts will be aggregated for this location.
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={() => isEditing ? editMutation.mutate() : createMutation.mutate()}
                disabled={!name || (!isAutoEdit && !hasValidCounters) || createMutation.isPending || editMutation.isPending}
              >
                {isEditing
                  ? (editMutation.isPending ? "Saving..." : "Save Changes")
                  : (createMutation.isPending ? "Creating..." : "Create Location")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>
              All Locations ({filteredLocations.length}{searchQuery && ` / ${locations?.length ?? 0}`})
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or counter ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filteredLocations.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>On Map</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead>Current Count</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.map((location) => (
                    <LocationRow
                      key={location.location_id}
                      location={location}
                      onEdit={openEditDialog}
                      onDelete={(loc) => deleteMutation.mutate(loc)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">
                {searchQuery ? `No locations matching "${searchQuery}"` : "No locations found"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
