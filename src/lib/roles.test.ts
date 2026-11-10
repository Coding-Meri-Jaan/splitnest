import { describe, expect, it } from "vitest";

import {
  assignableRoles,
  canChangeRole,
  canDeleteGroup,
  canEditLedger,
  canEditRow,
  canManageGroup,
  canRemoveMember,
  normalizeRole,
} from "./roles";

describe("normalizeRole", () => {
  it("maps the legacy member role to editor", () => {
    expect(normalizeRole("member")).toBe("editor");
  });

  it("keeps every current role and rejects unknown values", () => {
    expect(normalizeRole("owner")).toBe("owner");
    expect(normalizeRole("co_owner")).toBe("co_owner");
    expect(normalizeRole("editor")).toBe("editor");
    expect(normalizeRole("viewer")).toBe("viewer");
    expect(normalizeRole("admin")).toBeNull();
    expect(normalizeRole(null)).toBeNull();
  });
});

describe("ledger permissions", () => {
  it("lets owners, co-owners, and editors write", () => {
    expect(canEditLedger("owner")).toBe(true);
    expect(canEditLedger("co_owner")).toBe(true);
    expect(canEditLedger("editor")).toBe(true);
    expect(canEditLedger("viewer")).toBe(false);
    expect(canEditLedger(null)).toBe(false);
  });

  it("limits editors to rows they created", () => {
    expect(canEditRow("editor", true)).toBe(true);
    expect(canEditRow("editor", false)).toBe(false);
    expect(canEditRow("co_owner", false)).toBe(true);
    expect(canEditRow("owner", false)).toBe(true);
    expect(canEditRow("viewer", true)).toBe(false);
  });
});

describe("group management", () => {
  it("lets only the owner delete the group or change roles", () => {
    expect(canDeleteGroup("owner")).toBe(true);
    expect(canDeleteGroup("co_owner")).toBe(false);
    expect(canChangeRole("owner", "editor")).toBe(true);
    expect(canChangeRole("co_owner", "editor")).toBe(false);
    expect(canChangeRole("owner", "owner")).toBe(false);
  });

  it("lets owners and co-owners manage members", () => {
    expect(canManageGroup("owner")).toBe(true);
    expect(canManageGroup("co_owner")).toBe(true);
    expect(canManageGroup("editor")).toBe(false);
  });

  it("stops co-owners from removing peers and owners", () => {
    expect(canRemoveMember("owner", "co_owner", false)).toBe(true);
    expect(canRemoveMember("co_owner", "co_owner", false)).toBe(false);
    expect(canRemoveMember("co_owner", "editor", false)).toBe(true);
    expect(canRemoveMember("editor", "viewer", false)).toBe(false);
    expect(canRemoveMember("owner", "owner", true)).toBe(false);
    expect(canRemoveMember("editor", "editor", true)).toBe(true);
  });

  it("never offers the owner role when inviting", () => {
    expect(assignableRoles("owner")).toEqual(["co_owner", "editor", "viewer"]);
    expect(assignableRoles("co_owner")).toEqual(["editor", "viewer"]);
    expect(assignableRoles("editor")).toEqual([]);
    expect(assignableRoles("viewer")).toEqual([]);
  });
});
