"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Trash2, MessageSquare, Eye } from "lucide-react";
import { format } from "date-fns";
import type { Report } from "@/lib/types";

export default function ReportsPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["allReports"],
    queryFn: () => api.getAllReports(),
  });

  const resolveMutation = useMutation({
    mutationFn: (reportId: string) => api.resolveReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allReports"] });
      queryClient.invalidateQueries({ queryKey: ["pendingReports"] });
      toast.success("Report marked as resolved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reportId: string) => api.deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allReports"] });
      queryClient.invalidateQueries({ queryKey: ["pendingReports"] });
      toast.success("Report deleted");
      setSelectedReport(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredReports = reports?.filter((report) => {
    if (filter === "all") return true;
    return report.report_status === filter;
  });

  const pendingCount = reports?.filter((r) => r.report_status === "pending").length || 0;
  const resolvedCount = reports?.filter((r) => r.report_status === "resolved").length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">
          Review and manage user-submitted reports
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <MessageSquare className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Reports</CardTitle>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filteredReports && filteredReports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.report_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{report.user_name || "Anonymous"}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.user_email || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{report.location || "-"}</TableCell>
                    <TableCell>
                      <p className="truncate max-w-[200px]">
                        {report.report_content}
                      </p>
                    </TableCell>
                    <TableCell>
                      {format(new Date(report.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          report.report_status === "pending"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {report.report_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedReport(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {report.report_status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => resolveMutation.mutate(report.report_id)}
                            disabled={resolveMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(report.report_id)}
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
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No reports found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="font-medium">{selectedReport.user_name || "Anonymous"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedReport.user_email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedReport.location || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedReport.date), "PPp")}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Report Content</p>
                <p className="mt-1 p-3 bg-muted rounded-lg">
                  {selectedReport.report_content}
                </p>
              </div>
              {selectedReport.other && (
                <div>
                  <p className="text-sm text-muted-foreground">Additional Info</p>
                  <p className="mt-1 p-3 bg-muted rounded-lg">
                    {selectedReport.other}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                {selectedReport.report_status === "pending" && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      resolveMutation.mutate(selectedReport.report_id);
                      setSelectedReport(null);
                    }}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Mark as Resolved
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(selectedReport.report_id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
