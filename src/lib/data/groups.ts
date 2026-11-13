import type { SupabaseClient } from "@supabase/supabase-js";

import { displayName } from "@/lib/display-name";
import { computeNetBalances, simplifyDebts } from "@/lib/money";
import { isMissingSchemaMessage, SchemaMissingError } from "@/lib/data/errors";
import { normalizeRole } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, MemberRole } from "@/types/database";
import type {
  ActivityItem,
  BalanceView,
  DashboardSummary,
  ExpenseView,
  GroupDetail,
  GroupView,
  Person,
  SettlementView,
  TransferView,
} from "@/types";

type Client = SupabaseClient<Database>;
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type MembershipRow = Database["public"]["Tables"]["group_members"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type SplitRow = Database["public"]["Tables"]["expense_splits"]["Row"];
type SettlementRow = Database["public"]["Tables"]["settlements"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface Ledger {
  groups: GroupRow[];
  memberships: MembershipRow[];
  expenses: ExpenseRow[];
  splits: SplitRow[];
  settlements: SettlementRow[];
  profiles: ProfileRow[];
}

const toRupees = (paise: number) => paise / 100;

function fail(context: string, message: string): never {
  const fullMessage = `Could not load ${context}: ${message}`;
  if (isMissingSchemaMessage(message)) {
    throw new SchemaMissingError(fullMessage);
  }
  throw new Error(fullMessage);
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}

/**
 * Loads every row needed to compute balances for the signed-in user,
 * optionally narrowed to a single group.
 *
 * Every table's SELECT policy already limits rows to groups the user belongs
 * to, so all six reads can run in one parallel wave. Fetching memberships
 * first just to discover group ids is what used to make every page wait on
 * four sequential Supabase round-trips.
 */
export async function loadLedger(
  supabase: Client,
  onlyGroupId?: string,
): Promise<Ledger> {
  const groupsQuery = supabase
    .from("groups")
    .select("id, name, emoji, created_by, created_at, archived_at");
  const membershipsQuery = supabase
    .from("group_members")
    .select("group_id, user_id, role, joined_at");
  const expensesQuery = supabase
    .from("expenses")
    .select(
      "id, group_id, title, amount_paise, paid_by, category, spent_at, notes, created_by, created_at, split_mode",
    )
    .order("spent_at", { ascending: false })
    .order("created_at", { ascending: false });
  const settlementsQuery = supabase
    .from("settlements")
    .select(
      "id, group_id, from_user, to_user, amount_paise, method, note, settled_at, created_by, created_at",
    )
    .order("settled_at", { ascending: false });
  const splitsQuery = supabase
    .from("expense_splits")
    .select("expense_id, user_id, share_paise, split_value");
  const profilesQuery = supabase
    .from("profiles")
    .select("id, email, full_name, city, upi_id, created_at, updated_at");

  const [
    groupsResult,
    membershipsResult,
    expensesResult,
    settlementsResult,
    splitsResult,
    profilesResult,
  ] = await Promise.all([
    onlyGroupId ? groupsQuery.eq("id", onlyGroupId) : groupsQuery,
    onlyGroupId ? membershipsQuery.eq("group_id", onlyGroupId) : membershipsQuery,
    onlyGroupId ? expensesQuery.eq("group_id", onlyGroupId) : expensesQuery,
    onlyGroupId ? settlementsQuery.eq("group_id", onlyGroupId) : settlementsQuery,
    splitsQuery,
    profilesQuery,
  ]);

  if (groupsResult.error) fail("your groups", groupsResult.error.message);
  if (membershipsResult.error) fail("group members", membershipsResult.error.message);
  if (expensesResult.error) fail("expenses", expensesResult.error.message);
  if (settlementsResult.error) fail("settlements", settlementsResult.error.message);
  if (splitsResult.error) fail("expense splits", splitsResult.error.message);
  if (profilesResult.error) fail("member profiles", profilesResult.error.message);

  const expenses = expensesResult.data ?? [];
  const expenseIds = new Set(expenses.map((expense) => expense.id));
  // Splits are RLS-filtered too, but keep only the rows that belong to the
  // expenses in this view so a narrowed page never mentions another group.
  const splits = (splitsResult.data ?? []).filter((split) =>
    expenseIds.has(split.expense_id),
  );
  const memberships = membershipsResult.data ?? [];
  const settlements = settlementsResult.data ?? [];

  // Profiles are only readable while you share a group, so a member who has
  // already left disappears from this query. Ask for everyone the ledger
  // mentions anyway; the ones still visible keep their real names, and the
  // rest fall back to a neutral label below.
  const profileIds = new Set<string>([
    ...memberships.map((row) => row.user_id),
    ...expenses.map((row) => row.paid_by),
    ...expenses.map((row) => row.created_by),
    ...splits.map((row) => row.user_id),
    ...settlements.flatMap((row) => [row.from_user, row.to_user]),
  ]);

  return {
    groups: groupsResult.data ?? [],
    memberships,
    expenses,
    splits,
    settlements,
    profiles: (profilesResult.data ?? []).filter((profile) =>
      profileIds.has(profile.id),
    ),
  };
}

function ledgerParticipantIds(ledger: Ledger): Set<string> {
  const ids = new Set<string>();

  for (const expense of ledger.expenses) {
    ids.add(expense.paid_by);
    ids.add(expense.created_by);
  }
  for (const split of ledger.splits) {
    ids.add(split.user_id);
  }
  for (const settlement of ledger.settlements) {
    ids.add(settlement.from_user);
    ids.add(settlement.to_user);
  }

  return ids;
}

export function memberMap(ledger: Ledger): Map<string, Person> {
  const people = new Map(
    ledger.profiles.map((profile) => [
      profile.id,
      {
        id: profile.id,
        name: displayName(profile),
        email: profile.email,
        city: profile.city,
      },
    ]),
  );

  // Someone who left after settling up keeps their rows in the ledger. Their
  // profile is no longer readable, so label them instead of showing "Member".
  for (const id of ledgerParticipantIds(ledger)) {
    if (!people.has(id)) {
      people.set(id, { id, name: "Former member", email: "", city: null });
    }
  }

  return people;
}

function netByGroup(ledger: Ledger, groupId: string): Record<string, number> {
  const expenses = ledger.expenses.filter((expense) => expense.group_id === groupId);
  const splitsByExpense = groupBy(ledger.splits, (split) => split.expense_id);
  const settlements = ledger.settlements.filter(
    (settlement) => settlement.group_id === groupId,
  );

  return computeNetBalances(
    expenses.map((expense) => ({
      paidBy: expense.paid_by,
      amountPaise: expense.amount_paise,
      splits: (splitsByExpense.get(expense.id) ?? []).map((split) => ({
        userId: split.user_id,
        sharePaise: split.share_paise,
      })),
    })),
    settlements.map((settlement) => ({
      fromUser: settlement.from_user,
      toUser: settlement.to_user,
      amountPaise: settlement.amount_paise,
    })),
  );
}

export function buildGroups(ledger: Ledger, userId: string): GroupView[] {
  const people = memberMap(ledger);
  const membersByGroup = groupBy(ledger.memberships, (row) => row.group_id);

  return ledger.groups
    .map((group) => {
      const rows = membersByGroup.get(group.id) ?? [];
      const role = normalizeRole(
        rows.find((row) => row.user_id === userId)?.role ?? null,
      );
      const members = rows
        .map((row): Person | null => {
          const person = people.get(row.user_id);
          return person
            ? { ...person, role: normalizeRole(row.role) }
            : null;
        })
        .filter((person): person is Person => person !== null)
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        id: group.id,
        name: group.name,
        emoji: group.emoji,
        creatorId: group.created_by,
        members,
        memberCount: members.length,
        role,
        netBalance: toRupees(netByGroup(ledger, group.id)[userId] ?? 0),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildExpenseViews(ledger: Ledger): ExpenseView[] {
  const people = memberMap(ledger);
  const groupNames = new Map(ledger.groups.map((group) => [group.id, group.name]));
  const splitsByExpense = groupBy(ledger.splits, (split) => split.expense_id);

  return ledger.expenses.map((expense) => {
    const splits = (splitsByExpense.get(expense.id) ?? [])
      .map((split) => ({
        userId: split.user_id,
        share: toRupees(split.share_paise),
        inputValue:
          split.split_value === null ? null : Number(split.split_value),
      }))
      .sort((a, b) => a.userId.localeCompare(b.userId));

    return {
      id: expense.id,
      groupId: expense.group_id,
      groupName: groupNames.get(expense.group_id) ?? "Group",
      title: expense.title,
      amount: toRupees(expense.amount_paise),
      paidById: expense.paid_by,
      paidByName: people.get(expense.paid_by)?.name ?? "Member",
      date: expense.spent_at,
      category: expense.category,
      notes: expense.notes,
      createdById: expense.created_by,
      splitMode: expense.split_mode,
      splits,
      splitUserIds: splits.map((split) => split.userId),
      splitCount: splits.length,
    };
  });
}

function buildSettlementViews(ledger: Ledger): SettlementView[] {
  const people = memberMap(ledger);

  return ledger.settlements.map((settlement) => ({
    id: settlement.id,
    groupId: settlement.group_id,
    fromUserId: settlement.from_user,
    fromName: people.get(settlement.from_user)?.name ?? "Member",
    toUserId: settlement.to_user,
    toName: people.get(settlement.to_user)?.name ?? "Member",
    amount: toRupees(settlement.amount_paise),
    method: settlement.method,
    note: settlement.note,
    date: settlement.settled_at,
    createdById: settlement.created_by,
  }));
}

/** Peer balances across every group: positive means they owe you. */
function buildPeerBalances(ledger: Ledger, userId: string): BalanceView[] {
  const people = memberMap(ledger);
  const peerNet: Record<string, number> = {};

  for (const group of ledger.groups) {
    const net = netByGroup(ledger, group.id);
    for (const [memberId, amount] of Object.entries(net)) {
      if (memberId === userId) continue;
      peerNet[memberId] = (peerNet[memberId] ?? 0) - amount;
    }
  }

  return Object.entries(peerNet)
    .filter(([, paise]) => paise !== 0)
    .map(([memberId, paise]) => ({
      memberId,
      name: people.get(memberId)?.name ?? "Member",
      amount: toRupees(paise),
    }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

export interface DashboardData {
  summary: DashboardSummary;
  groups: GroupView[];
  recentExpenses: ExpenseView[];
  balances: BalanceView[];
}

export async function getDashboardData(
  userId: string,
): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const ledger = await loadLedger(supabase);

  const groups = buildGroups(ledger, userId);
  const balances = buildPeerBalances(ledger, userId);

  const youAreOwed = balances
    .filter((balance) => balance.amount > 0)
    .reduce((sum, balance) => sum + balance.amount, 0);
  const youOwe = balances
    .filter((balance) => balance.amount < 0)
    .reduce((sum, balance) => sum - balance.amount, 0);

  return {
    summary: {
      youAreOwed,
      youOwe,
      netBalance: youAreOwed - youOwe,
      activeGroups: groups.length,
    },
    groups,
    recentExpenses: buildExpenseViews(ledger).slice(0, 6),
    balances,
  };
}

export async function getGroups(userId: string): Promise<GroupView[]> {
  const supabase = await createSupabaseServerClient();
  const ledger = await loadLedger(supabase);
  return buildGroups(ledger, userId);
}

export interface GroupBasics {
  id: string;
  name: string;
  emoji: string;
  creatorId: string;
  role: MemberRole | null;
  members: Person[];
}

/**
 * The light group loader for forms and settings. It skips expenses, splits,
 * settlements, and balance maths, so opening "add expense" no longer pays for
 * the full ledger.
 */
export async function getGroupBasics(
  userId: string,
  groupId: string,
): Promise<GroupBasics | null> {
  const supabase = await createSupabaseServerClient();
  const [groupResult, membersResult, profilesResult] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, emoji, created_by")
      .eq("id", groupId)
      .maybeSingle(),
    supabase
      .from("group_members")
      .select("user_id, role")
      .eq("group_id", groupId),
    supabase.from("profiles").select("id, email, full_name, city"),
  ]);

  if (groupResult.error) fail("this group", groupResult.error.message);
  if (membersResult.error) fail("group members", membersResult.error.message);
  if (profilesResult.error) fail("member profiles", profilesResult.error.message);

  const group = groupResult.data;
  const rows = membersResult.data ?? [];
  const myRow = rows.find((row) => row.user_id === userId);

  // RLS filters groups you do not belong to, so a missing row means either the
  // group is gone or you are not a member. Both should look like "not found".
  if (!group || !myRow) return null;

  const people = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.id,
      {
        id: profile.id,
        name: displayName(profile),
        email: profile.email,
        city: profile.city,
      } satisfies Person,
    ]),
  );

  const members = rows
    .map((row): Person | null => {
      const person = people.get(row.user_id);
      return person
        ? { ...person, role: normalizeRole(row.role) }
        : null;
    })
    .filter((person): person is Person => person !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    id: group.id,
    name: group.name,
    emoji: group.emoji,
    creatorId: group.created_by,
    role: normalizeRole(myRow.role),
    members,
  };
}

export async function getGroupDetail(
  userId: string,
  groupId: string,
): Promise<GroupDetail | null> {
  const supabase = await createSupabaseServerClient();
  const ledger = await loadLedger(supabase, groupId);

  const group = buildGroups(ledger, userId)[0];
  if (!group) return null;

  const people = memberMap(ledger);
  const net = netByGroup(ledger, groupId);
  const balances: BalanceView[] = Object.entries(net)
    .filter(([memberId]) => memberId !== userId)
    .map(([memberId, paise]) => ({
      memberId,
      name: people.get(memberId)?.name ?? "Member",
      amount: toRupees(-paise),
    }))
    .filter((balance) => balance.amount !== 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  const suggestedTransfers: TransferView[] = simplifyDebts(net)
    .map((transfer) => ({
      fromUserId: transfer.fromUser,
      fromName: people.get(transfer.fromUser)?.name ?? "Member",
      toUserId: transfer.toUser,
      toName: people.get(transfer.toUser)?.name ?? "Member",
      amount: toRupees(transfer.amountPaise),
      toUpiId:
        ledger.profiles.find((profile) => profile.id === transfer.toUser)?.upi_id ?? null,
    }))
    .sort((a, b) => b.amount - a.amount);

  const expenses = buildExpenseViews(ledger);
  const settlements = buildSettlementViews(ledger).filter(
    (settlement) => settlement.groupId === groupId,
  );
  const totalSpent = ledger.expenses
    .filter((expense) => expense.group_id === groupId)
    .reduce((sum, expense) => sum + expense.amount_paise, 0);

  return {
    group,
    expenses,
    settlements,
    balances,
    suggestedTransfers,
    totalSpent: toRupees(totalSpent),
  };
}

export async function getActivity(): Promise<ActivityItem[]> {
  const supabase = await createSupabaseServerClient();
  const ledger = await loadLedger(supabase);
  const people = memberMap(ledger);
  const groupNames = new Map(ledger.groups.map((group) => [group.id, group.name]));

  const expenses: ActivityItem[] = ledger.expenses.map((expense) => ({
    id: `expense-${expense.id}`,
    kind: "expense",
    title: expense.title,
    groupId: expense.group_id,
    groupName: groupNames.get(expense.group_id) ?? "Group",
    amount: toRupees(expense.amount_paise),
    date: expense.spent_at,
    actorName: people.get(expense.paid_by)?.name ?? "Member",
    category: expense.category,
  }));

  const settlements: ActivityItem[] = ledger.settlements.map((settlement) => ({
    id: `settlement-${settlement.id}`,
    kind: "settlement",
    title: `${people.get(settlement.from_user)?.name ?? "Someone"} paid ${
      people.get(settlement.to_user)?.name ?? "someone"
    }`,
    groupId: settlement.group_id,
    groupName: groupNames.get(settlement.group_id) ?? "Group",
    amount: toRupees(settlement.amount_paise),
    date: settlement.settled_at,
    actorName: people.get(settlement.from_user)?.name ?? "Member",
    category: null,
  }));

  return [...expenses, ...settlements]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40);
}

export interface PersonSummary extends Person {
  sharedGroups: number;
  /** Positive: they owe you across shared groups. */
  netBalance: number;
}

export async function getPeople(userId: string): Promise<PersonSummary[]> {
  const supabase = await createSupabaseServerClient();
  const ledger = await loadLedger(supabase);
  const people = memberMap(ledger);

  const sharedGroups = new Map<string, Set<string>>();
  for (const membership of ledger.memberships) {
    if (membership.user_id === userId) continue;
    const set = sharedGroups.get(membership.user_id) ?? new Set<string>();
    set.add(membership.group_id);
    sharedGroups.set(membership.user_id, set);
  }

  const netByPeer = new Map<string, number>();
  for (const group of ledger.groups) {
    const net = netByGroup(ledger, group.id);
    for (const [memberId, paise] of Object.entries(net)) {
      if (memberId === userId) continue;
      netByPeer.set(memberId, (netByPeer.get(memberId) ?? 0) - paise);
    }
  }

  return [...sharedGroups.entries()]
    .map(([memberId, groups]) => {
      const person = people.get(memberId);
      if (!person) return null;
      return {
        ...person,
        sharedGroups: groups.size,
        netBalance: toRupees(netByPeer.get(memberId) ?? 0),
      };
    })
    .filter((item): item is PersonSummary => Boolean(item))
    .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
}
