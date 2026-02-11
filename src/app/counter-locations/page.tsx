"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Minus, ChevronDown, ChevronRight, LayoutGrid, Copy } from "lucide-react";
import type { EnrichedLocation } from "@/lib/types";

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

function LocationRow({ location }: { location: EnrichedLocation }) {
  const [expanded, setExpanded] = useState(false);

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
            <span className="font-mono">{location.current_count}</span>
            {location.overcrowding_limit != null && (
              <span className="text-muted-foreground">
                / {location.overcrowding_limit}
              </span>
            )}
          </div>
        </TableCell>
      </TableRow>
      {expanded && location.devices.length > 0 && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 py-2 px-8">
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
  const { data: locations, isLoading } = useQuery({
    queryKey: ["allLocationsEnriched"],
    queryFn: () => api.getAllLocationsEnriched(),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Counter Locations</h2>
        <p className="text-muted-foreground">
          All locations including auto-created and non-map locations. Click a row to expand devices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            All Locations ({locations?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : locations && locations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>On Map</TableHead>
                  <TableHead>Devices</TableHead>
                  <TableHead>Current Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <LocationRow key={location.location_id} location={location} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No locations found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
