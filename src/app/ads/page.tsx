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
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Check,
  X,
  Trash2,
  Eye,
  Megaphone,
  Clock,
  DollarSign,
  ImageIcon,
  RefreshCw,
  MousePointerClick,
} from "lucide-react";
import { format } from "date-fns";
import type { Ad } from "@/lib/types";

type AdFilter = "all" | "pending_review" | "approved" | "rejected" | "expired";

export default function AdsPage() {
  const [filter, setFilter] = useState<AdFilter>("all");
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [adToReject, setAdToReject] = useState<Ad | null>(null);

  const queryClient = useQueryClient();

  const { data: ads, isLoading } = useQuery({
    queryKey: ["allAds"],
    queryFn: () => api.getAllAds(),
  });

  const { data: stats } = useQuery({
    queryKey: ["adStats"],
    queryFn: () => api.getAdStats(),
  });

  const approveMutation = useMutation({
    mutationFn: (adId: string) => api.approveAd(adId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAds"] });
      queryClient.invalidateQueries({ queryKey: ["adStats"] });
      toast.success("Ad approved successfully");
      setSelectedAd(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ adId, reason }: { adId: string; reason: string }) =>
      api.rejectAd(adId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAds"] });
      queryClient.invalidateQueries({ queryKey: ["adStats"] });
      toast.success("Ad rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
      setAdToReject(null);
      setSelectedAd(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (adId: string) => api.deleteAd(adId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAds"] });
      queryClient.invalidateQueries({ queryKey: ["adStats"] });
      toast.success("Ad deleted");
      setSelectedAd(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const expireMutation = useMutation({
    mutationFn: () => api.expireAds(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allAds"] });
      queryClient.invalidateQueries({ queryKey: ["adStats"] });
      toast.success(`Expired ${data.expired_count} ads`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredAds = ads?.filter((ad) => {
    if (filter === "all") return true;
    return ad.status === filter;
  });

  const getStatusBadge = (status: Ad["status"]) => {
    const variants: Record<Ad["status"], "default" | "secondary" | "destructive" | "outline"> = {
      pending_review: "default",
      approved: "secondary",
      rejected: "destructive",
      expired: "outline",
    };
    const labels: Record<Ad["status"], string> = {
      pending_review: "Pending Review",
      approved: "Approved",
      rejected: "Rejected",
      expired: "Expired",
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const openRejectDialog = (ad: Ad) => {
    setAdToReject(ad);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (adToReject) {
      rejectMutation.mutate({ adId: adToReject.id, reason: rejectReason });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ads</h2>
          <p className="text-muted-foreground">
            Review and manage user-submitted advertisements
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => expireMutation.mutate()}
          disabled={expireMutation.isPending}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Expire Old Ads
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ads</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.pending_review || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.active || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <X className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.rejected || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats?.total_revenue?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.total_clicks || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Ads</CardTitle>
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as AdFilter)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filteredAds && filteredAds.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAds.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ad.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {ad.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm">{ad.device_id}</code>
                    </TableCell>
                    <TableCell>{ad.duration_hours}h</TableCell>
                    <TableCell>${ad.total_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className="text-blue-600 font-medium">{ad.click_count || 0}</span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(ad.submitted_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{getStatusBadge(ad.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedAd(ad)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {ad.status === "pending_review" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => approveMutation.mutate(ad.id)}
                              disabled={approveMutation.isPending}
                              title="Approve"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openRejectDialog(ad)}
                              disabled={rejectMutation.isPending}
                              title="Reject"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(ad.id)}
                          disabled={deleteMutation.isPending}
                          title="Delete"
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
              <Megaphone className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No ads found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ad Details Dialog */}
      <Dialog open={!!selectedAd} onOpenChange={() => setSelectedAd(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ad Details</DialogTitle>
          </DialogHeader>
          {selectedAd && (
            <div className="space-y-4 pt-4">
              {/* Image Preview */}
              {selectedAd.image_path && (
                <div className="flex justify-center">
                  <img
                    src={api.getAdImageUrl(selectedAd.image_path) || ""}
                    alt={selectedAd.title}
                    className="max-h-48 rounded-lg object-cover"
                  />
                </div>
              )}
              {!selectedAd.image_path && (
                <div className="flex justify-center">
                  <div className="h-32 w-48 bg-muted rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="font-medium">{selectedAd.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedAd.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Device</p>
                  <code className="font-medium">{selectedAd.device_id}</code>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{selectedAd.duration_hours} hours</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium">${selectedAd.total_price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clicks</p>
                  <p className="font-medium text-blue-600">{selectedAd.click_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CTA Button</p>
                  <p className="font-medium">{selectedAd.cta_text || "View Details"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Link Type</p>
                  <p className="font-medium capitalize">{selectedAd.cta_link_type || "default"}</p>
                </div>
                {selectedAd.cta_link_type === "custom" && selectedAd.cta_url && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Custom URL</p>
                    <a
                      href={selectedAd.cta_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline break-all"
                    >
                      {selectedAd.cta_url}
                    </a>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {format(new Date(selectedAd.submitted_at), "PPp")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expires</p>
                  <p className="font-medium">
                    {format(new Date(selectedAd.expiration_date), "PPp")}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1 p-3 bg-muted rounded-lg">
                  {selectedAd.description}
                </p>
              </div>

              {selectedAd.rejection_reason && (
                <div>
                  <p className="text-sm text-muted-foreground">Rejection Reason</p>
                  <p className="mt-1 p-3 bg-red-50 dark:bg-red-950 rounded-lg text-red-700 dark:text-red-300">
                    {selectedAd.rejection_reason}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Payment ID</p>
                <code className="text-xs">{selectedAd.payment_intent_id}</code>
              </div>

              <div className="flex gap-2 pt-4">
                {selectedAd.status === "pending_review" && (
                  <>
                    <Button
                      className="flex-1"
                      onClick={() => approveMutation.mutate(selectedAd.id)}
                      disabled={approveMutation.isPending}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedAd(null);
                        openRejectDialog(selectedAd);
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </>
                )}
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(selectedAd.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Ad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to reject &quot;{adToReject?.title}&quot;? This action
              cannot be undone.
            </p>
            <div>
              <label className="text-sm font-medium">
                Rejection Reason (optional)
              </label>
              <Textarea
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              Reject Ad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
