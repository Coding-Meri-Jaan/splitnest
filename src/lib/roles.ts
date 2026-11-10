import type { MemberRole } from "@/types/database";

export type GroupRole = MemberRole;

export const GROUP_ROLES: GroupRole[] = [
  "owner",
  "co_owner",
  "editor",
  "viewer",
];

export const ROLE_LABELS: Record<GroupRole, string> = {
  owner: "Owner",
  co_owner: "Co-owner",
  editor: "Editor",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<GroupRole, string> = {
  owner: "Full control, including deleting the group and changing roles.",
  co_owner: "Can rename the group, manage members, and edit every expense.",
  editor: "Can add expenses and settlements, and edit the ones they add.",
  viewer: "Can see the group and its balances, but cannot make changes.",
};

const ROLE_RANK: Record<GroupRole, number> = {
  viewer: 1,
  editor: 2,
  co_owner: 3,
  owner: 4,
};

/**
 * Older databases only have `owner`/`member`, where `member` behaved exactly
 * like today's editor. Normalising here keeps the app usable while the roles
 * migration is being applied, and keeps every permission check in one place.
 */
export function normalizeRole(
  value: string | null | undefined,
): GroupRole | null {
  switch (value) {
    case "owner":
      return "owner";
    case "co_owner":
      return "co_owner";
    case "editor":
    case "member":
      return "editor";
    case "viewer":
      return "viewer";
    default:
      return null;
  }
}

export function isAtLeast(role: GroupRole | null, minimum: GroupRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** Viewers cannot create or change anything in the ledger. */
export function canEditLedger(role: GroupRole | null): boolean {
  return isAtLeast(role, "editor");
}

/** Rename, add members, and remove editors/viewers. */
export function canManageGroup(role: GroupRole | null): boolean {
  return isAtLeast(role, "co_owner");
}

/** Only the owner can change roles or delete the group. */
export function canManageRoles(role: GroupRole | null): boolean {
  return role === "owner";
}

export function canDeleteGroup(role: GroupRole | null): boolean {
  return role === "owner";
}

/**
 * Owners and co-owners can edit any expense or settlement. Editors can only
 * touch rows they created. Viewers can only read.
 */
export function canEditRow(
  role: GroupRole | null,
  isAuthor: boolean,
): boolean {
  if (!role) return false;
  if (isAtLeast(role, "co_owner")) return true;
  return role === "editor" && isAuthor;
}

/**
 * Owners can remove co-owners, editors, and viewers. Co-owners can remove
 * editors and viewers, but not other co-owners. Nobody can remove the owner.
 */
export function canRemoveMember(
  actor: GroupRole | null,
  target: GroupRole | null,
  isSelf: boolean,
): boolean {
  if (!actor || !target) return false;
  if (isSelf) return target !== "owner";
  if (actor === "owner") return target !== "owner";
  if (actor === "co_owner") return target === "editor" || target === "viewer";
  return false;
}

/** Role changes are owner-only, and the owner row itself cannot be reassigned. */
export function canChangeRole(
  actor: GroupRole | null,
  target: GroupRole | null,
): boolean {
  return actor === "owner" && target !== null && target !== "owner";
}

/** Roles an actor may hand out when adding or updating a member. */
export function assignableRoles(actor: GroupRole | null): GroupRole[] {
  if (actor === "owner") return ["co_owner", "editor", "viewer"];
  if (actor === "co_owner") return ["editor", "viewer"];
  return [];
}
