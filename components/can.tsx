"use client";

import { useRole } from "@/hooks/use-profile";
import type { ProfileRole } from "@/lib/types/database";

type CanProps = {
  role?: ProfileRole | ProfileRole[];
  action?: "upload" | "manage_clients" | "agency_settings" | "approve" | "comment";
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

const ACTION_ROLES: Record<NonNullable<CanProps["action"]>, ProfileRole[]> = {
  upload: ["admin"],
  manage_clients: ["admin"],
  agency_settings: ["admin"],
  approve: ["admin", "member", "viewer"],
  comment: ["admin", "member", "viewer"],
};

export function Can({ role, action, fallback = null, children }: CanProps) {
  const { role: currentRole, isAdmin } = useRole();
  let allowed = false;
  if (role !== undefined) {
    const roles = Array.isArray(role) ? role : [role];
    allowed = currentRole !== null && roles.includes(currentRole);
  }
  if (action !== undefined) {
    const rolesForAction = ACTION_ROLES[action];
    allowed = currentRole !== null && rolesForAction.includes(currentRole);
  }
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
