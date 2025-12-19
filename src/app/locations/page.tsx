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
import { Plus, Trash2, MapPin } from "lucide-react";

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
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [deviceId, setDeviceId] = useState("");
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
      return api.addLocation({
        location_name: name,
        location_address: address,
        location_device: deviceId,
        location_latitude: selectedPosition.lat,
        location_longitude: selectedPosition.lng,
        location_color: selectedColor,
        location_icon: selectedIcon,
      });
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

  function resetForm() {
    setIsOpen(false);
    setName("");
    setAddress("");
    setDeviceId("");
    setSelectedPosition(null);
    setSelectedColor("blue");
    setSelectedIcon("");
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
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Location</DialogTitle>
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
                  <Label htmlFor="device">Device ID</Label>
                  <Input
                    id="device"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    placeholder="e.g., A1234"
                  />
                </div>
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
                onClick={() => createMutation.mutate()}
                disabled={!name || !deviceId || !selectedPosition || createMutation.isPending}
              >
                {createMutation.isPending ? "Adding..." : "Add Location"}
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
                  <TableHead>Device</TableHead>
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
                      <code className="text-sm">{location.location_device}</code>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(location.location_device)}
                        disabled={deleteMutation.isPending}
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
