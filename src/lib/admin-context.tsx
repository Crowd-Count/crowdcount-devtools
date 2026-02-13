"use client";

import { createContext, useContext, useState, useCallback } from "react";

export type AdminPermissions = Record<string, number>;

export interface AdminContextType {
  username: string;
  permissions: AdminPermissions | "all"; // "all" for superadmin
  hasPermission: (perm: string) => boolean;
  setAdmin: (username: string, permissions: AdminPermissions | "all") => void;
  clearAdmin: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState("");
  const [permissions, setPermissions] = useState<AdminPermissions | "all">("all");

  const hasPermission = useCallback(
    (perm: string) => {
      if (permissions === "all") return true;
      return !!permissions[perm];
    },
    [permissions]
  );

  const setAdmin = useCallback(
    (name: string, perms: AdminPermissions | "all") => {
      setUsername(name);
      setPermissions(perms);
    },
    []
  );

  const clearAdmin = useCallback(() => {
    setUsername("");
    setPermissions("all");
  }, []);

  return (
    <AdminContext.Provider
      value={{ username, permissions, hasPermission, setAdmin, clearAdmin }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextType {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return ctx;
}
