import type { SupabaseClient } from "@supabase/supabase-js";

import { computeNetBalances, simplifyDebts } from "@/lib/money";
import { isMissingSchemaMessage, SchemaMissingError } from "@/lib/data/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  ActivityItem,
  BalanceView,
  DashboardSummary,
  ExpenseView,
  GroupDetail,
  GroupView,
  Person,
  TransferView,
} from "@/types";

type Client = SupabaseClient<Database>;
type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
type MembershipRow = Database["public"]["Tables"]["group_members"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type SplitRow = Database["public"]["Tables"]["expense_splits"]["Row"];
type SettlementRow = Database["public"]["Tables"]["settlements"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface Ledger {
  groups: GroupRow[];
  memberships: MembershipRow[];
  expenses: ExpenseRow[];
  splits: SplitRow[];
  settlements: SettlementRow[];
  profiles: ProfileRow[];
}

const EMPTY_LEDGER: Ledger = {
  groups: [],
  memberships: [],
  expenses: [],
  splits: [],
  settlements: [],
  profiles: [],
};

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
 * optionally narrowed to a single group. RLS already limits rows to groups
 * the user belongs to.
 */
async function loadLedger(
  supabase: Client,
  userId: string,
  onlyGroupId?: string,
): Promise<Ledger> {
  let membershipQuery = supabase
    .from("group_members")
    .select("group_id, user_id, role, joined_at")
    .eq("user_id", userId);

  if (onlyGroupId) {
    membershipQuery = membershipQuery.eq("group_id", onlyGroupId);
  }

  const { data: mine, error: membershipError } = await membershipQuery;
  if (membershipError) fail("your groups", membershipError.message);

  const groupIds = [...new Set((mine ?? []).map((row) => row.group_id))];
  if (groupIds.length === 0) return EMPTY_LEDGER;

  const [groupsResult, membershipsResult, expensesResult, settlementsResult] =
    await Promise.all([
      supabase
        .from("groups")
        .select("id, name, emoji, created_by, created_at, archived_at")
        .in("id", groupIds),
      supabase
        .from("group_members")
        .select("group_id, user_id, role, joined_at")
        .in("group_id", groupIds),
      supabase
        .from("expenses")
        .select(
          "id, group_id, title, amount_paise, paid_by, category, spent_at, notes, created_by, created_at",
        )
        .in("group_id", groupIds)
        .order("spent_at", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("settlements")
        .select(
          "id, group_id, from_user, to_user, amount_paise, method, note, settled_at, created_by, created_at",
        )
        .in("group_id", groupIds)
        .order("settled_at", { ascending: false }),
    ]);

  if (groupsResult.error) fail("your groups", groupsResult.error.message);
  if (membershipsResult.error) fail("group members", membershipsResult.error.message);
  if (expensesResult.error) fail("expenses", expensesResult.error.message);
  if (settlementsResult.error) fail("settlements", settlementsResult.error.message);

  const expenses = expensesResult.data ?? [];
  const expenseIds = expenses.map((expense) => expense.id);

  const splitsResult =
    expenseIds.length > 0
      ? await supabase
          .from("expense_splits")
          .select("expense_id, user_id, share_paise")
          .in("expense_id", expenseIds)
      : { data: [] as SplitRow[], error: null };

  if (splitsResult.error) fail("expense splits", splitsResult.error.message);

  const memberships = membershipsResult.data ?? [];
  const profileIds = [...new Set(memberships.map((row) => row.user_id))];

  const profilesResult =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, email, full_name, city, upi_id, created_at, updated_at")
          .in("id", profileIds)
      : { data: [] as ProfileRow[], error: null };

  if (profilesResult.error) fail("member profiles", profilesResult.error.message);

  return {
    groups: groupsResult.data ?? [],
    memberships,
    expenses,
    splits: splitsResult.data ?? [],
    settlements: settlementsResult.data ?? [],
    profiles: profilesResult.data ?? [],
  };
}

function memberMap(ledger: Ledger): Map<string, Person> {
  return new Map(
    ledger.profiles.map((profile) => [
      profile.id,
      {
        id: profile.id,
        name: profile.full_name.trim() || profile.email.split("@")[0] || "Member",
        email: profile.email,
        city: profile.city,
      },
    ]),
  );
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

function buildGroups(ledger: Ledger, userId: string): GroupView[] {
  const people = memberMap(ledger);
  const membersByGroup = groupBy(ledger.memberships, (row) => row.group_id);

  return ledger.groups
    .map((group) => {
      const members = (membersByGroup.get(group.id) ?? [])
        .map((row) => people.get(row.user_id))
        .filter((person): person is Person => Boolean(person))
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        id: group.id,
        name: group.name,
        emoji: group.emoji,
        creatorId: group.created_by,
        members,
        memberCount: members.length,
        netBalance: toRupees(netByGroup(ledger, group.id)[userId] ?? 0),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildExpenseViews(ledger: Ledger): ExpenseView[] {
  const people = memberMap(ledger);
  const groupNames = new Map(ledger.groups.map((group) => [group.id, group.name]));
  const splitCounts = groupBy(ledger.splits, (split) => split.expense_id);

  return ledger.expenses.map((expense) => ({
    id: expense.id,
    groupId: expense.group_id,
    groupName: groupNames.get(expense.group_id) ?? "Group",
    title: expense.title,
    amount: toRupees(expense.amount_paise),
    paidById: expense.paid_by,
    paidByName: people.get(expense.paid_by)?.name ?? "Member",
    date: expense.spent_at,
    category: expense.category,
    splitCount: (splitCounts.get(expense.id) ?? []).length,
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
  const ledger = await loadLedger(supabase, userId);

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
  const ledger = await loadLedger(supabase, userId);
  return buildGroups(ledger, userId);
}

export async function getGroupDetail(
  userId: string,
  groupId: string,
): Promise<GroupDetail | null> {
  const supabase = await createSupabaseServerClient();
  const ledger = await loadLedger(supabase, userId, groupId);

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
  const totalSpent = ledger.expenses
    .filter((expense) => expense.group_id === groupId)
    .reduce((sum, expense) => sum + expense.amount_paise, 0);

  return {
    group,
    expenses,
    balances,
    suggestedTransfers,
    totalSpent: toRupees(totalSpent),
  };
}

export async function getActivity(userId: string): Promise<ActivityItem[]> {
  const supabase = await createSupabaseServerClient();
  const ledger = await loadLedger(supabase, userId);
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
  const ledger = await loadLedger(supabase, userId);
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
