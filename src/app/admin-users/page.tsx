"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, ShieldAlert, Database, FileCode } from "lucide-react";
import type { AdminAccount } from "@/lib/types";

const ALL_PERMISSIONS = [
  "devices",
  "counting",
  "users",
  "reports",
  "alerts",
  "login_texts",
  "locations",
  "ads",
];

function PermissionToggles({
  permissions,
  onChange,
}: {
  permissions: Record<string, number>;
  onChange: (permissions: Record<string, number>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ALL_PERMISSIONS.map((perm) => (
        <div key={perm} className="flex items-center justify-between gap-2">
          <Label htmlFor={`perm-${perm}`} className="text-sm capitalize">
            {perm.replace("_", " ")}
          </Label>
          <Switch
            id={`perm-${perm}`}
            checked={!!permissions[perm]}
            onCheckedChange={(checked) =>
              onChange({ ...permissions, [perm]: checked ? 1 : 0 })
            }
          />
        </div>
      ))}
    </div>
  );
}

export default function AdminUsersPage() {
  const { isRootAdmin } = useAdmin();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<AdminAccount | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<AdminAccount | null>(null);

  // Create form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPermissions, setNewPermissions] = useState<Record<string, number>>({});

  // Edit form state
  const [editPermissions, setEditPermissions] = useState<Record<string, number>>({});
  const [editPassword, setEditPassword] = useState("");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["adminAccounts"],
    queryFn: () => api.listAdminAccounts(),
    enabled: isRootAdmin,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createAdminAccount(newUsername, newPassword, newPermissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminAccounts"] });
      toast.success(`Admin "${newUsername}" created`);
      setCreateOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewPermissions({});
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const updates: { permissions?: Record<string, number>; new_password?: string } = {
        permissions: editPermissions,
      };
      if (editPassword) updates.new_password = editPassword;
      return api.updateAdminAccount(editAccount!.username, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminAccounts"] });
      toast.success(`Admin "${editAccount!.username}" updated`);
      setEditAccount(null);
      setEditPassword("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAdminAccount(deleteAccount!.username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminAccounts"] });
      toast.success(`Admin "${deleteAccount!.username}" deleted`);
      setDeleteAccount(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!isRootAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <ShieldAlert className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-sm text-muted-foreground text-center">
              Only root_admin can manage admin accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dbAccounts = accounts?.filter((a) => a.source === "database") || [];
  const envAccounts = accounts?.filter((a) => a.source === "env_var") || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Users</h2>
          <p className="text-muted-foreground">
            Create and manage admin accounts
          </p>
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) {
              setNewUsername("");
              setNewPassword("");
              setNewPermissions({});
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Admin Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="e.g., manager1"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <PermissionToggles
                  permissions={newPermissions}
                  onChange={setNewPermissions}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={
                  createMutation.isPending || !newUsername || !newPassword
                }
              >
                {createMutation.isPending ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accounts?.length || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dbAccounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Env Var</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{envAccounts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Admin Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : accounts && accounts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    const grantedPerms = ALL_PERMISSIONS.filter(
                      (p) => account.permissions[p]
                    );
                    const isDb = account.source === "database";
                    return (
                      <TableRow key={account.username}>
                        <TableCell>
                          <code className="font-medium">
                            {account.username}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isDb ? "default" : "secondary"}
                          >
                            {isDb ? "Database" : "Env Var"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {grantedPerms.length > 0 ? (
                              grantedPerms.map((p) => (
                                <Badge
                                  key={p}
                                  variant="outline"
                                  className="text-xs capitalize"
                                >
                                  {p.replace("_", " ")}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                None
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isDb ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditAccount(account);
                                  setEditPermissions({ ...account.permissions });
                                  setEditPassword("");
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteAccount(account)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Read-only
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">
                No admin accounts found
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                Create your first admin
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={!!editAccount}
        onOpenChange={(open) => {
          if (!open) {
            setEditAccount(null);
            setEditPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Admin: {editAccount?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Permissions</Label>
              <PermissionToggles
                permissions={editPermissions}
                onChange={setEditPermissions}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPassword">
                New Password{" "}
                <span className="text-muted-foreground font-normal">
                  (leave blank to keep current)
                </span>
              </Label>
              <Input
                id="editPassword"
                type="password"
                placeholder="New password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteAccount}
        onOpenChange={(open) => {
          if (!open) setDeleteAccount(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Admin Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the admin account{" "}
              <code className="font-semibold text-foreground">
                {deleteAccount?.username}
              </code>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteAccount(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
