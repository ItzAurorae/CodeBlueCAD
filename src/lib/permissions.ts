import { useCad, type Membership } from "@/lib/cad";
import { useAuth } from "@/lib/auth";

export type CadRole = "owner" | "admin" | "supervisor" | "officer" | "trainee";

export const ROLES: { value: CadRole; label: string; description: string }[] = [
  { value: "owner", label: "Owner", description: "Full control of the community" },
  { value: "admin", label: "Administrator", description: "Manage members and all entries" },
  { value: "supervisor", label: "Supervisor", description: "Moderate and delete entries" },
  { value: "officer", label: "Officer", description: "Create and edit entries" },
  { value: "trainee", label: "Trainee", description: "Read-only access" },
];

const RANK: Record<string, number> = {
  owner: 40,
  admin: 30,
  supervisor: 20,
  officer: 10,
  trainee: 5,
};

export function roleRank(role: string | null | undefined) {
  return RANK[String(role ?? "officer").toLowerCase()] ?? 5;
}

export function roleLabel(role: string | null | undefined) {
  return ROLES.find((r) => r.value === String(role ?? "").toLowerCase())?.label ?? "Officer";
}

/** Roles assignable by an admin — owner is derived from community ownership. */
export const ASSIGNABLE_ROLES = ROLES.filter((r) => r.value !== "owner");

export function effectiveRole(membership: Membership | null, userId: string | undefined): CadRole {
  if (!membership) return "trainee";
  if (userId && membership.communities?.owner_id === userId) return "owner";
  const role = String(membership.role ?? "officer").toLowerCase();
  return (ROLES.find((r) => r.value === role)?.value ?? "officer") as CadRole;
}

export type Permissions = {
  role: CadRole;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canModerate: boolean;
  canManageMembers: boolean;
  isOwner: boolean;
  atLeast: (role: CadRole) => boolean;
};

export function permissionsFor(role: CadRole): Permissions {
  const rank = roleRank(role);
  return {
    role,
    canView: true,
    canCreate: rank >= RANK["officer"]!,
    canEdit: rank >= RANK["officer"]!,
    canModerate: rank >= RANK["supervisor"]!,
    canManageMembers: rank >= RANK["admin"]!,
    isOwner: role === "owner",
    atLeast: (other) => rank >= roleRank(other),
  };
}

export function usePermissions(): Permissions {
  const { active } = useCad();
  const { user } = useAuth();
  return permissionsFor(effectiveRole(active, user?.id));
}
