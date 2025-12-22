"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Calendar, Type } from "lucide-react";
import { format } from "date-fns";

export default function LoginTextsPage() {
  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);

  // Form states
  const [newText, setNewText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideText, setOverrideText] = useState("");

  const queryClient = useQueryClient();

  // Queries
  const { data: poolTexts, isLoading: isPoolLoading } = useQuery({
    queryKey: ["loginTextPool"],
    queryFn: () => api.getLoginTextPool(),
  });

  const { data: todayText } = useQuery({
    queryKey: ["todayLoginText"],
    queryFn: () => api.getTodayLoginText(),
  });

  const { data: upcomingTexts } = useQuery({
    queryKey: ["upcomingLoginTexts"],
    queryFn: () => api.getUpcomingLoginTexts(7),
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: (text: string) => api.addLoginText(text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loginTextPool"] });
      toast.success("Text added to pool");
      setIsAddOpen(false);
      setNewText("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api.updateLoginText(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loginTextPool"] });
      toast.success("Text updated");
      setIsEditOpen(false);
      setEditId(null);
      setEditText("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteLoginText(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loginTextPool"] });
      toast.success("Text deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.toggleLoginTextActive(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loginTextPool"] });
      toast.success("Status updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const overrideMutation = useMutation({
    mutationFn: ({ date, text }: { date: string; text: string }) =>
      api.setLoginTextOverride(date, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcomingLoginTexts"] });
      queryClient.invalidateQueries({ queryKey: ["todayLoginText"] });
      toast.success("Override set");
      setIsOverrideOpen(false);
      setOverrideDate("");
      setOverrideText("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const clearOverrideMutation = useMutation({
    mutationFn: (date: string) => api.clearLoginTextOverride(date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcomingLoginTexts"] });
      queryClient.invalidateQueries({ queryKey: ["todayLoginText"] });
      toast.success("Override cleared");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Parse YYYY-MM-DD as local date (not UTC) to avoid timezone shift
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const safeFormatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      // Handle YYYY-MM-DD format as local date
      const date = dateStr.match(/^\d{4}-\d{2}-\d{2}$/)
        ? parseLocalDate(dateStr)
        : new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return format(date, "PP");
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr: string) => {
    try {
      // Handle YYYY-MM-DD format as local date
      const date = dateStr.match(/^\d{4}-\d{2}-\d{2}$/)
        ? parseLocalDate(dateStr)
        : new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return format(date, "EEE, MMM d");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Login Texts</h2>
          <p className="text-muted-foreground">
            Manage daily login screen texts displayed in the iOS app
          </p>
        </div>
        <div className="flex gap-2">
          {/* Add Text Dialog */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Text
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Text to Pool</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="text">Text</Label>
                  <Input
                    id="text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Enter login text..."
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => addMutation.mutate(newText)}
                  disabled={!newText.trim() || addMutation.isPending}
                >
                  {addMutation.isPending ? "Adding..." : "Add to Pool"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Set Override Dialog */}
          <Dialog open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Set Override
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Date Override</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overrideText">Custom Text</Label>
                  <Input
                    id="overrideText"
                    value={overrideText}
                    onChange={(e) => setOverrideText(e.target.value)}
                    placeholder="Enter custom text for this date..."
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() =>
                    overrideMutation.mutate({ date: overrideDate, text: overrideText })
                  }
                  disabled={
                    !overrideDate || !overrideText.trim() || overrideMutation.isPending
                  }
                >
                  {overrideMutation.isPending ? "Setting..." : "Set Override"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Today's Text Card */}
      {todayText && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Today&apos;s Text
            </CardTitle>
            <CardDescription>
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">&quot;{todayText.text}&quot;</span>
              {todayText.is_override && (
                <Badge variant="secondary">Override</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Text Pool Table */}
      <Card>
        <CardHeader>
          <CardTitle>Text Pool</CardTitle>
          <CardDescription>
            Texts that can be randomly selected for daily display
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPoolLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : poolTexts && poolTexts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Text</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poolTexts.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.text}</TableCell>
                    <TableCell>
                      <Switch
                        checked={item.active}
                        onCheckedChange={(active) =>
                          toggleMutation.mutate({ id: item.id, active })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {safeFormatDate(item.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditId(item.id);
                            setEditText(item.text);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(item.id)}
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
            <p className="text-muted-foreground">
              No texts in pool. Add some texts to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Texts Card */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Schedule</CardTitle>
          <CardDescription>Preview of texts for the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingTexts && upcomingTexts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Text</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingTexts.map((item) => (
                  <TableRow key={item.date}>
                    <TableCell>{formatShortDate(item.date)}</TableCell>
                    <TableCell>{item.text || "(Not selected yet)"}</TableCell>
                    <TableCell>
                      {item.is_override ? (
                        <Badge variant="secondary">Override</Badge>
                      ) : item.text ? (
                        <Badge variant="outline">Random</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.is_override && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => clearOverrideMutation.mutate(item.date)}
                          disabled={clearOverrideMutation.isPending}
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
            <p className="text-muted-foreground">No upcoming texts scheduled.</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Text</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="editText">Text</Label>
              <Input
                id="editText"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (editId) {
                  updateMutation.mutate({ id: editId, text: editText });
                }
              }}
              disabled={!editText.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
