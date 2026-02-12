"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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
import { Plus, Trash2, MapPin, X, Edit2 } from "lucide-react";
import type { Location } from "@/lib/types";

// Dynamic import for map to avoid SSR issues
const LocationMap = dynamic(
  () => import("@/components/locations/location-map").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-muted flex items-center justify-center rounded-lg">
        Loading map...
      </div>
    ),
  }
);

const colorOptions = [
  { name: "red", hex: "#ef4444" },
  { name: "orange", hex: "#f97316" },
  { name: "yellow", hex: "#eab308" },
  { name: "green", hex: "#22c55e" },
  { name: "mint", hex: "#34d399" },
  { name: "teal", hex: "#14b8a6" },
  { name: "cyan", hex: "#06b6d4" },
  { name: "blue", hex: "#3b82f6" },
  { name: "indigo", hex: "#6366f1" },
  { name: "purple", hex: "#a855f7" },
  { name: "pink", hex: "#ec4899" },
  { name: "brown", hex: "#a16207" },
];

interface CounterEntry {
  id: string;
  label: string;
}

export default function LocationsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [overcrowdingLimit, setOvercrowdingLimit] = useState("");
  const [counters, setCounters] = useState<CounterEntry[]>([{ id: "", label: "" }]);
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState("blue");
  const [selectedIcon, setSelectedIcon] = useState("");

  const queryClient = useQueryClient();

  const { data: locations, isLoading } = useQuery({
    queryKey: ["locationsWithData"],
    queryFn: () => api.getAllMapLocations(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPosition) throw new Error("Please select a location on the map");
      const validCounters = counters.filter((c) => c.id.trim() !== "");
      if (validCounters.length === 0) throw new Error("Add at least one counter");
      const deviceIds = validCounters.map((c) => c.id.trim());
      const deviceLabels: Record<string, string> = {};
      for (const c of validCounters) {
        if (c.label.trim()) {
          deviceLabels[c.id.trim()] = c.label.trim();
        }
      }
      return api.createLocation(
        deviceIds,
        name,
        address,
        selectedPosition.lat,
        selectedPosition.lng,
        selectedColor,
        selectedIcon,
        overcrowdingLimit ? Number(overcrowdingLimit) : undefined,
        Object.keys(deviceLabels).length > 0 ? deviceLabels : undefined,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locationsWithData"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location created successfully");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (location: Location) =>
      api.deleteLocation(location.location_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locationsWithData"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPosition) throw new Error("Please select a location on the map");
      if (!editingLocation) throw new Error("No location selected for editing");

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
        address,
        latitude: selectedPosition.lat,
        longitude: selectedPosition.lng,
        color: selectedColor,
        icon: selectedIcon,
        overcrowding_limit: overcrowdingLimit ? Number(overcrowdingLimit) : null,
      };

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
      queryClient.invalidateQueries({ queryKey: ["locationsWithData"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location updated successfully");
      resetForm();
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
    setAddress("");
    setOvercrowdingLimit("");
    setCounters([{ id: "", label: "" }]);
    setSelectedPosition(null);
    setSelectedColor("blue");
    setSelectedIcon("");
  }

  function openEditDialog(location: Location) {
    setIsEditing(true);
    setEditingLocation(location);
    setName(location.location_name);
    setAddress(location.location_address || "");
    setOvercrowdingLimit(location.overcrowding_limit != null ? String(location.overcrowding_limit) : "");
    setCounters(
      location.devices.length > 0
        ? location.devices.map((d) => ({ id: d[0], label: d[1] }))
        : [{ id: "", label: "" }]
    );
    setSelectedPosition(
      location.location_latitude != null && location.location_longitude != null
        ? { lat: location.location_latitude, lng: location.location_longitude }
        : null
    );
    setSelectedColor(location.location_color || "blue");
    setSelectedIcon(location.location_icon || "");
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

  // Helper to get hex from color name for display
  const getHexFromName = (colorName: string) => {
    return colorOptions.find(c => c.name === colorName)?.hex || "#3b82f6";
  };

  const hasValidCounters = counters.some((c) => c.id.trim() !== "");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Map Locations</h2>
          <p className="text-muted-foreground">
            Manage map locations and device assignments
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          else setIsOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Location" : "Add New Location"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g., 123 Main Street"
                  />
                </div>
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCounter}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Counter
                  </Button>
                </div>

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
                      />
                    </div>
                    <div className="flex items-end">
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
                    </div>
                  </div>
                ))}

                {counters.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {counters.filter((c) => c.id.trim()).length} counter{counters.filter((c) => c.id.trim()).length !== 1 ? "s" : ""} total. Counts will be aggregated for this location.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Click on map to set location</Label>
                <div className="h-[250px] rounded-lg overflow-hidden border">
                  <LocationMap
                    locations={[]}
                    onLocationClick={(lat, lng) => setSelectedPosition({ lat, lng })}
                    selectedPosition={selectedPosition}
                  />
                </div>
                {selectedPosition && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marker Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(color.name)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          selectedColor === color.name ? "border-foreground" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Selected: {selectedColor}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Input
                    id="icon"
                    value={selectedIcon}
                    onChange={(e) => setSelectedIcon(e.target.value)}
                    placeholder="e.g., building, gym, library"
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => isEditing ? editMutation.mutate() : createMutation.mutate()}
                disabled={!name || !hasValidCounters || !selectedPosition || createMutation.isPending || editMutation.isPending}
              >
                {isEditing
                  ? (editMutation.isPending ? "Saving..." : "Save Changes")
                  : (createMutation.isPending ? "Adding..." : "Add Location")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Map View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <LocationMap locations={locations || []} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : locations && locations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Counters</TableHead>
                  <TableHead>Current Count</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.location_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getHexFromName(location.location_color || "blue") }}
                        />
                        <span className="font-medium">{location.location_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{location.location_address || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {location.devices.map((d) => (
                          <Badge key={d[0]} variant="secondary" className="text-xs">
                            {d[0]}{d[1] && d[1] !== "Counter" ? ` (${d[1]})` : ""}
                          </Badge>
                        ))}
                        {location.devices.length === 0 && (
                          <span className="text-muted-foreground text-sm">No devices</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{location.current_count}</span>
                        {location.overcrowding_limit != null && (
                          <span className="text-muted-foreground">
                            / {location.overcrowding_limit}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(location)}
                          disabled={editMutation.isPending}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(location)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No locations found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsOpen(true)}>
                Add your first location
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
