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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Minus, ChevronDown, ChevronRight, LayoutGrid, Copy, Edit2, Trash2, X, Search } from "lucide-react";
import type { EnrichedLocation } from "@/lib/types";

interface CounterEntry {
  id: string;
  label: string;
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

  const isPending = addMutation.isPending;

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
          onClick={() => addMutation.mutate(-1)}
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

  function addCounter() {
    setCounters([...counters, { id: "", label: "" }]);
  }

  function removeCounter(index: number) {
    if (counters.length <= 1) return;
    setCounters(counters.filter((_, i) => i !== index));
  }

  function updateCounter(index: number, field: "id" | "label", value: string) {
    const updated = [...counters];
    updated[index] = { ...updated[index], [field]: value };
    setCounters(updated);
  }

  const isAutoEdit = isEditing && editingLocation?.is_auto;
  const hasValidCounters = counters.some((c) => c.id.trim() !== "");

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
      <div className="flex items-center justify-between">
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
                <div className="flex items-center justify-between">
                  <Label>Counters</Label>
                  {!isAutoEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCounter}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Counter
                    </Button>
                  )}
                </div>

                {isAutoEdit && (
                  <p className="text-xs text-muted-foreground">
                    Auto-location devices cannot be changed. Only name and limit can be edited.
                  </p>
                )}

                {counters.map((counter, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 p-3 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Counter ID
                      </Label>
                      <Input
                        value={counter.id}
                        onChange={(e) => updateCounter(index, "id", e.target.value)}
                        placeholder="e.g., T1234"
                        disabled={!!isAutoEdit}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Label (optional)
                      </Label>
                      <Input
                        value={counter.label}
                        onChange={(e) => updateCounter(index, "label", e.target.value)}
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
                          onClick={() => removeCounter(index)}
                          disabled={counters.length <= 1}
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {!isAutoEdit && counters.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {counters.filter((c) => c.id.trim()).length} counter{counters.filter((c) => c.id.trim()).length !== 1 ? "s" : ""} total. Counts will be aggregated for this location.
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
            <div className="relative w-72">
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
