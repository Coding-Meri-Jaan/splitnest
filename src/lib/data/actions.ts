"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/user";
import { displayName } from "@/lib/display-name";
import { parseRupeesToPaise } from "@/lib/money";
import { buildSplitShares, isSplitMode } from "@/lib/splits";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ExpenseCategory } from "@/types/database";
import type { ExpenseSplitMode } from "@/types";
import type { FormState } from "@/lib/form-state";

const CATEGORIES: ExpenseCategory[] = [
  "food",
  "travel",
  "groceries",
  "rent",
  "utilities",
  "entertainment",
  "shopping",
  "other",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isCategory(value: string): value is ExpenseCategory {
  return (CATEGORIES as string[]).includes(value);
}

function revalidateGroup(groupId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/groups");
  revalidatePath("/dashboard/activity");
  revalidatePath("/dashboard/people");
  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/groups/${groupId}/settings`);
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function membershipRole(
  supabase: SupabaseServerClient,
  groupId: string,
  userId: string,
): Promise<"owner" | "member" | null> {
  const { data } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  return data?.role ?? null;
}

/**
 * Whether a member appears anywhere in this group's ledger. Removing someone
 * who paid, owes, or settled would leave rows that point at a non-member, so
 * the group owner has to clear those records first.
 */
async function memberHasActivity(
  supabase: SupabaseServerClient,
  groupId: string,
  memberId: string,
): Promise<boolean> {
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, paid_by, created_by")
    .eq("group_id", groupId);

  const rows = expenses ?? [];
  if (rows.some((row) => row.paid_by === memberId || row.created_by === memberId)) {
    return true;
  }

  if (rows.length > 0) {
    const { count } = await supabase
      .from("expense_splits")
      .select("expense_id", { count: "exact", head: true })
      .eq("user_id", memberId)
      .in(
        "expense_id",
        rows.map((row) => row.id),
      );

    if ((count ?? 0) > 0) return true;
  }

  const [paid, received] = await Promise.all([
    supabase
      .from("settlements")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("from_user", memberId),
    supabase
      .from("settlements")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("to_user", memberId),
  ]);

  return (paid.count ?? 0) + (received.count ?? 0) > 0;
}


export async function createGroupAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  const name = text(formData, "name");
  const emoji = text(formData, "emoji") || "🏠";

  if (name.length === 0 || name.length > 80) {
    return { error: "Give the group a name (up to 80 characters).", message: null };
  }

  const supabase = await createSupabaseServerClient();

  // Generate the id here instead of asking PostgREST to return the inserted
  // row. The groups SELECT policy only covers members, and the owner row in
  // group_members is written by an AFTER INSERT trigger, so `insert().select()`
  // fails with an RLS error when PostgREST tries to read the new row back.
  const groupId = crypto.randomUUID();
  const { error } = await supabase
    .from("groups")
    .insert({ id: groupId, name, emoji, created_by: user.id });

  if (error) {
    return { error: "Could not create the group. Please try again.", message: null };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/groups");
  redirect(`/dashboard/groups/${groupId}`);
}

export async function updateGroupAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  const groupId = text(formData, "groupId");
  const name = text(formData, "name");
  const emoji = text(formData, "emoji") || "🏠";

  if (!isUuid(groupId)) {
    return { error: "That group could not be found.", message: null };
  }
  if (name.length === 0 || name.length > 80) {
    return { error: "Give the group a name (up to 80 characters).", message: null };
  }
  if (emoji.length > 16) {
    return { error: "Pick a shorter emoji.", message: null };
  }

  const supabase = await createSupabaseServerClient();
  const role = await membershipRole(supabase, groupId, user.id);

  if (role !== "owner") {
    return { error: "Only the group owner can rename this group.", message: null };
  }

  const { data, error } = await supabase
    .from("groups")
    .update({ name, emoji })
    .eq("id", groupId)
    .select("id");

  if (error || !data || data.length === 0) {
    return { error: "Could not update the group. Please try again.", message: null };
  }

  revalidateGroup(groupId);
  return { error: null, message: "Group updated." };
}

export async function deleteGroupAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  const groupId = text(formData, "groupId");

  if (!isUuid(groupId)) {
    return { error: "That group could not be found.", message: null };
  }

  const supabase = await createSupabaseServerClient();
  const role = await membershipRole(supabase, groupId, user.id);

  if (role !== "owner") {
    return { error: "Only the group owner can delete this group.", message: null };
  }

  // Return the deleted row so an RLS-filtered no-op is reported as a failure
  // instead of redirecting as if the group had been removed.
  const { data: deleted, error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .select("id");

  if (error || !deleted || deleted.length === 0) {
    return { error: "Could not delete the group. Please try again.", message: null };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/groups");
  revalidatePath("/dashboard/activity");
  revalidatePath("/dashboard/people");
  redirect("/dashboard/groups?deleted=group");
}

export async function addMemberAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  const groupId = text(formData, "groupId");
  const email = text(formData, "email").toLowerCase();

  if (!isUuid(groupId)) {
    return { error: "That group could not be found.", message: null };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address.", message: null };
  }

  const supabase = await createSupabaseServerClient();
  if ((await membershipRole(supabase, groupId, user.id)) !== "owner") {
    return { error: "Only the group owner can add members.", message: null };
  }

  const { data: matches, error: lookupError } = await supabase.rpc(
    "find_user_for_invite",
    { gid: groupId, lookup_email: email },
  );

  if (lookupError) {
    return { error: "Could not look up that email. Please try again.", message: null };
  }

  const match = matches?.[0];
  if (!match) {
    return {
      error: "No SplitNest account uses that email yet. Ask them to sign up first.",
      message: null,
    };
  }

  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: match.id, role: "member" });

  if (error) {
    const duplicate = error.code === "23505";
    return {
      error: duplicate ? "They are already in this group." : "Could not add that person.",
      message: null,
    };
  }

  revalidateGroup(groupId);
  const addedName = displayName({ full_name: match.full_name, email });
  return {
    error: null,
    message:
      addedName === "Member"
        ? "They were added to the group."
        : `${addedName} was added to the group.`,
  };
}

export async function removeMemberAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  const groupId = text(formData, "groupId");
  const memberId = text(formData, "memberId");

  if (!isUuid(groupId) || !isUuid(memberId)) {
    return { error: "That member could not be found.", message: null };
  }

  const leaving = memberId === user.id;
  const supabase = await createSupabaseServerClient();
  const myRole = await membershipRole(supabase, groupId, user.id);

  if (!myRole) {
    return { error: "You are not a member of this group.", message: null };
  }
  if (!leaving && myRole !== "owner") {
    return { error: "Only the group owner can remove members.", message: null };
  }

  const targetRole = await membershipRole(supabase, groupId, memberId);
  if (!targetRole) {
    return { error: "They are no longer in this group.", message: null };
  }
  if (targetRole === "owner") {
    return {
      error: leaving
        ? "The owner cannot leave. Delete the group instead."
        : "The owner cannot be removed. Delete the group instead.",
      message: null,
    };
  }

  if (await memberHasActivity(supabase, groupId, memberId)) {
    return {
      error: leaving
        ? "You have expenses or settlements in this group. Ask the owner to delete those records before you leave."
        : "They have expenses or settlements in this group. Delete those records before removing them.",
      message: null,
    };
  }

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", memberId);

  if (error) {
    return {
      error: leaving ? "Could not leave the group." : "Could not remove that member.",
      message: null,
    };
  }

  if (leaving) {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/groups");
    revalidatePath("/dashboard/activity");
    revalidatePath("/dashboard/people");
    redirect("/dashboard/groups?left=1");
  }

  // RLS can silently filter a delete. Confirm the membership really went away
  // before telling the owner it succeeded.
  if (await membershipRole(supabase, groupId, memberId)) {
    return { error: "Could not remove that member.", message: null };
  }

  revalidateGroup(groupId);
  return { error: null, message: "Member removed." };
}

interface ExpenseInput {
  groupId: string;
  title: string;
  amountPaise: number;
  paidBy: string;
  category: ExpenseCategory;
  spentAt: string;
  notes: string;
  splitMode: ExpenseSplitMode;
  splitUserIds: string[];
  splitValues: Record<string, string>;
}

function readExpenseInput(
  formData: FormData,
): { input: ExpenseInput } | { error: string } {
  const groupId = text(formData, "groupId");
  const title = text(formData, "title");
  const amountPaise = parseRupeesToPaise(text(formData, "amount"));
  const paidBy = text(formData, "paidBy");
  const categoryValue = text(formData, "category");
  const spentAt = text(formData, "spentAt");
  const notes = text(formData, "notes");
  const splitModeValue = text(formData, "splitMode") || "equal";
  const splitAmong = formData
    .getAll("splitAmong")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const splitUserIds = [...new Set(splitAmong)];

  if (!isUuid(groupId) || title.length === 0) {
    return { error: "Add a title for the expense." };
  }
  if (!amountPaise) {
    return { error: "Enter an amount greater than ₹0." };
  }
  if (!paidBy) {
    return { error: "Choose who paid." };
  }
  if (splitUserIds.length === 0) {
    return { error: "Select at least one person to split with." };
  }
  if (!isSplitMode(splitModeValue)) {
    return { error: "Choose a split method." };
  }
  if (!DATE_PATTERN.test(spentAt)) {
    return { error: "Choose a valid date." };
  }
  if (!isCategory(categoryValue)) {
    return { error: "Choose a category." };
  }

  const splitValues: Record<string, string> = {};
  if (splitModeValue !== "equal") {
    for (const userId of splitUserIds) {
      splitValues[userId] = text(formData, `splitValue_${userId}`);
    }
  }

  return {
    input: {
      groupId,
      title,
      amountPaise,
      paidBy,
      category: categoryValue,
      spentAt,
      notes,
      splitMode: splitModeValue,
      splitUserIds,
      splitValues,
    },
  };
}

function expenseSplits(input: ExpenseInput) {
  return buildSplitShares({
    totalPaise: input.amountPaise,
    mode: input.splitMode,
    participants: input.splitUserIds.map((userId) => ({
      userId,
      value: input.splitValues[userId],
    })),
  });
}

function rpcSplits(splits: { userId: string; sharePaise: number; splitValue: number | null }[]) {
  return splits.map((split) => ({
    user_id: split.userId,
    share_paise: split.sharePaise,
    split_value: split.splitValue,
  }));
}

export async function createExpenseAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await getCurrentUser();
  const parsed = readExpenseInput(formData);

  if ("error" in parsed) {
    return { error: parsed.error, message: null };
  }

  const input = parsed.input;
  const built = expenseSplits(input);
  if ("error" in built) {
    return { error: built.error, message: null };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_expense", {
    p_group_id: input.groupId,
    p_title: input.title,
    p_amount_paise: input.amountPaise,
    p_paid_by: input.paidBy,
    p_category: input.category,
    p_spent_at: input.spentAt,
    p_notes: input.notes || null,
    p_split_mode: input.splitMode,
    p_splits: rpcSplits(built.splits),
  });

  if (error) {
    return {
      error:
        error.message.includes("not a member") || error.message.includes("split member")
          ? "Everyone on this expense must belong to the group."
          : "Could not save the expense. Please try again.",
      message: null,
    };
  }

  revalidateGroup(input.groupId);
  redirect(`/dashboard/groups/${input.groupId}?added=1`);
}

export async function updateExpenseAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  const expenseId = text(formData, "expenseId");

  if (!isUuid(expenseId)) {
    return { error: "That expense could not be found.", message: null };
  }

  const parsed = readExpenseInput(formData);
  if ("error" in parsed) {
    return { error: parsed.error, message: null };
  }

  const input = parsed.input;
  const built = expenseSplits(input);
  if ("error" in built) {
    return { error: built.error, message: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: loadError } = await supabase
    .from("expenses")
    .select("id, group_id, created_by")
    .eq("id", expenseId)
    .maybeSingle();

  if (loadError || !existing || existing.group_id !== input.groupId) {
    return { error: "That expense could not be found.", message: null };
  }
  if (existing.created_by !== user.id) {
    return { error: "You can only edit expenses you added.", message: null };
  }

  // The split rows are writable only by the expense author, so an in-place
  // rewrite cannot be done atomically through PostgREST. Create the corrected
  // expense + splits with the existing atomic RPC, then remove the old row. If
  // the delete fails, drop the new row again so nothing is left duplicated.
  const { data: createdId, error: createError } = await supabase.rpc("create_expense", {
    p_group_id: input.groupId,
    p_title: input.title,
    p_amount_paise: input.amountPaise,
    p_paid_by: input.paidBy,
    p_category: input.category,
    p_spent_at: input.spentAt,
    p_notes: input.notes || null,
    p_split_mode: input.splitMode,
    p_splits: rpcSplits(built.splits),
  });

  if (createError || !createdId) {
    return {
      error:
        createError?.message.includes("not a member") ||
        createError?.message.includes("split member")
          ? "Everyone on this expense must belong to the group."
          : "Could not update the expense. Please try again.",
      message: null,
    };
  }

  const { data: removed, error: deleteError } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("group_id", input.groupId)
    .select("id");

  // If the old row could not be removed, roll the new row back rather than
  // leaving two copies of the same expense in the group.
  if (deleteError || !removed || removed.length === 0) {
    await supabase
      .from("expenses")
      .delete()
      .eq("id", createdId)
      .eq("group_id", input.groupId)
      .select("id");
    return { error: "Could not update the expense. Please try again.", message: null };
  }

  revalidateGroup(input.groupId);
  redirect(`/dashboard/groups/${input.groupId}?updated=1`);
}

export async function recordSettlementAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  const groupId = text(formData, "groupId");
  const fromUser = text(formData, "fromUser");
  const toUser = text(formData, "toUser");
  const amountPaise = parseRupeesToPaise(text(formData, "amount"));
  const method = text(formData, "method") || "upi";
  const note = text(formData, "note");
  const settledAt = text(formData, "settledAt");

  if (
    !isUuid(groupId) ||
    !isUuid(fromUser) ||
    !isUuid(toUser) ||
    fromUser === toUser
  ) {
    return { error: "Choose who paid whom.", message: null };
  }
  if (!amountPaise) {
    return { error: "Enter an amount greater than ₹0.", message: null };
  }
  if (!["upi", "cash", "bank_transfer", "other"].includes(method)) {
    return { error: "Choose a payment method.", message: null };
  }

  const supabase = await createSupabaseServerClient();
  const [fromRole, toRole] = await Promise.all([
    membershipRole(supabase, groupId, fromUser),
    membershipRole(supabase, groupId, toUser),
  ]);

  if (!fromRole || !toRole) {
    return { error: "Both people must belong to this group.", message: null };
  }

  const { error } = await supabase.from("settlements").insert({
    group_id: groupId,
    from_user: fromUser,
    to_user: toUser,
    amount_paise: amountPaise,
    method: method as "upi" | "cash" | "bank_transfer" | "other",
    note: note || null,
    settled_at: DATE_PATTERN.test(settledAt) ? settledAt : new Date().toISOString().slice(0, 10),
    created_by: user.id,
  });

  if (error) {
    return { error: "Could not record the settlement. Please try again.", message: null };
  }

  revalidateGroup(groupId);
  redirect(`/dashboard/groups/${groupId}?settled=1`);
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  await getCurrentUser();
  const expenseId = text(formData, "expenseId");
  const groupId = text(formData, "groupId");

  if (!isUuid(groupId)) {
    redirect("/dashboard/groups?deleteError=invalid");
  }
  if (!isUuid(expenseId)) {
    redirect(`/dashboard/groups/${groupId}?deleteError=expense`);
  }

  const supabase = await createSupabaseServerClient();
  // Ask PostgREST to return the deleted row. RLS silently filters rows a user
  // may not delete, so an empty result means the delete did not happen. Without
  // this check the action would claim success while the expense remained.
  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .select("id");

  revalidateGroup(groupId);

  if (error || !data || data.length === 0) {
    redirect(`/dashboard/groups/${groupId}?deleteError=expense`);
  }

  redirect(`/dashboard/groups/${groupId}?deleted=expense`);
}

export async function deleteSettlementAction(formData: FormData): Promise<void> {
  await getCurrentUser();
  const settlementId = text(formData, "settlementId");
  const groupId = text(formData, "groupId");

  if (!isUuid(groupId)) {
    redirect("/dashboard/groups?deleteError=invalid");
  }
  if (!isUuid(settlementId)) {
    redirect(`/dashboard/groups/${groupId}?deleteError=settlement`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("settlements")
    .delete()
    .eq("id", settlementId)
    .eq("group_id", groupId)
    .select("id");

  revalidateGroup(groupId);

  if (error || !data || data.length === 0) {
    redirect(`/dashboard/groups/${groupId}?deleteError=settlement`);
  }

  redirect(`/dashboard/groups/${groupId}?deleted=settlement`);
}

export async function updateProfileAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  const fullName = text(formData, "fullName");
  const city = text(formData, "city");
  const upiId = text(formData, "upiId");

  if (fullName.length < 2) {
    return { error: "Enter your name.", message: null };
  }
  if (upiId && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
    return { error: "That does not look like a UPI id (e.g. name@okhdfcbank).", message: null };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, city: city || null, upi_id: upiId || null })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save your profile.", message: null };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/people");
  revalidatePath("/dashboard/settings");
  return { error: null, message: "Profile updated." };
}
