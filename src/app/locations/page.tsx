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
import type { LocationDevice, Location } from "@/lib/types";

// Dynamic import for map to avoid SSR issues
const LocationMap = dynamic(
  () => import("@/components/locations/location-map").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full bg-muted flex items-center justify-center rounded-lg">
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

export default function LocationsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("");
  const [additionalCounters, setAdditionalCounters] = useState<LocationDevice[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState("blue");
  const [selectedIcon, setSelectedIcon] = useState("");

  const queryClient = useQueryClient();

  const { data: locations, isLoading } = useQuery({
    queryKey: ["locationsWithData"],
    queryFn: () => api.getAllLocationsWithData(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPosition) throw new Error("Please select a location on the map");
      // Build the list of additional devices (excluding the primary, filtering out empty IDs)
      const validCounters = additionalCounters.filter((c) => c.id.trim() !== "");
      const additionalDevices = validCounters.length > 0
        ? validCounters.map((c) => ({
            id: c.id.trim(),
            label: c.label.trim() || `Counter ${validCounters.indexOf(c) + 2}`,
          }))
        : undefined;
      return api.addLocation(
        {
          location_name: name,
          location_address: address,
          location_device: deviceId,
          location_latitude: selectedPosition.lat,
          location_longitude: selectedPosition.lng,
          location_color: selectedColor,
          location_icon: selectedIcon,
        },
        additionalDevices
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locationsWithData"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location added successfully");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (deviceId: string) => api.removeLocation(deviceId),
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

      // First, delete the old location
      await api.removeLocation(editingLocation.location_device);

      // Then create the new one with updated info
      const validCounters = additionalCounters.filter((c) => c.id.trim() !== "");
      const additionalDevices = validCounters.length > 0
        ? validCounters.map((c) => ({
            id: c.id.trim(),
            label: c.label.trim() || `Counter ${validCounters.indexOf(c) + 2}`,
          }))
        : undefined;

      return api.addLocation(
        {
          location_name: name,
          location_address: address,
          location_device: deviceId,
          location_latitude: selectedPosition.lat,
          location_longitude: selectedPosition.lng,
          location_color: selectedColor,
          location_icon: selectedIcon,
        },
        additionalDevices
      );
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
    setDeviceId("");
    setDeviceLabel("");
    setAdditionalCounters([]);
    setSelectedPosition(null);
    setSelectedColor("blue");
    setSelectedIcon("");
  }

  function openEditDialog(location: Location) {
    setIsEditing(true);
    setEditingLocation(location);
    setName(location.location_name);
    setAddress(location.location_address);
    setDeviceId(location.location_device);
    // Set device label from the first entry in device_breakdown if available
    if (location.device_breakdown && location.device_breakdown.length > 0) {
      setDeviceLabel(location.device_breakdown[0].device_label || "");
      // Load additional counters (skip the first one as it's the primary)
      const additional = location.device_breakdown.slice(1).map((d) => ({
        id: d.device_id,
        label: d.device_label,
      }));
      setAdditionalCounters(additional);
    } else {
      setDeviceLabel("");
      setAdditionalCounters([]);
    }
    setSelectedPosition({ lat: location.location_latitude, lng: location.location_longitude });
    setSelectedColor(location.location_color || "blue");
    setSelectedIcon(location.location_icon || "");
    setIsOpen(true);
  }

  function addCounter() {
    setAdditionalCounters([...additionalCounters, { id: "", label: "" }]);
  }

  function removeCounter(index: number) {
    setAdditionalCounters(additionalCounters.filter((_, i) => i !== index));
  }

  function updateCounter(index: number, field: "id" | "label", value: string) {
    const updated = [...additionalCounters];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalCounters(updated);
  }

  // Helper to get hex from color name for display
  const getHexFromName = (colorName: string) => {
    return colorOptions.find(c => c.name === colorName)?.hex || "#3b82f6";
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Locations</h2>
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

                {/* Primary Counter */}
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
                  <div className="space-y-1">
                    <Label htmlFor="device" className="text-xs text-muted-foreground">
                      Primary Counter ID
                    </Label>
                    <Input
                      id="device"
                      value={deviceId}
                      onChange={(e) => setDeviceId(e.target.value)}
                      placeholder="e.g., A1234"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="deviceLabel" className="text-xs text-muted-foreground">
                      Label (optional)
                    </Label>
                    <Input
                      id="deviceLabel"
                      value={deviceLabel}
                      onChange={(e) => setDeviceLabel(e.target.value)}
                      placeholder="e.g., Main Entrance"
                    />
                  </div>
                </div>

                {/* Additional Counters */}
                {additionalCounters.map((counter, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 p-3 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Counter ID
                      </Label>
                      <Input
                        value={counter.id}
                        onChange={(e) => updateCounter(index, "id", e.target.value)}
                        placeholder="e.g., B5678"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Label
                      </Label>
                      <Input
                        value={counter.label}
                        onChange={(e) => updateCounter(index, "label", e.target.value)}
                        placeholder="e.g., Side Entrance"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCounter(index)}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {additionalCounters.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {additionalCounters.length + 1} counter{additionalCounters.length > 0 ? "s" : ""} total. Counts will be aggregated for this location.
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
                disabled={!name || !deviceId || !selectedPosition || createMutation.isPending || editMutation.isPending}
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
          <LocationMap locations={locations || []} />
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
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.location_device}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getHexFromName(location.location_color) || location.location_color }}
                        />
                        <span className="font-medium">{location.location_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{location.location_address}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm">{location.location_device}</code>
                        {location.device_breakdown && location.device_breakdown.length > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            +{location.device_breakdown.length - 1} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{location.location_current_count ?? "-"}</span>
                        {location.location_overcrowding_count &&
                          location.location_overcrowding_count !== "N/A" && (
                            <span className="text-muted-foreground">
                              / {location.location_overcrowding_count}
                            </span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          location.location_comparison === "above"
                            ? "destructive"
                            : location.location_comparison === "below"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {location.location_comparison || "neutral"}
                      </Badge>
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
                          onClick={() => deleteMutation.mutate(location.location_device)}
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
