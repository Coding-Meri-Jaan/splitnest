"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/user";
import { displayName } from "@/lib/display-name";
import { parseRupeesToPaise, splitEqually } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ExpenseCategory } from "@/types/database";
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

export async function addMemberAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await getCurrentUser();
  const groupId = text(formData, "groupId");
  const email = text(formData, "email").toLowerCase();

  if (!groupId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address.", message: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data: matches, error: lookupError } = await supabase.rpc(
    "find_user_for_invite",
    { gid: groupId, lookup_email: email },
  );

  if (lookupError) {
    return { error: "Only the group owner can add members.", message: null };
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

export async function createExpenseAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await getCurrentUser();
  const groupId = text(formData, "groupId");
  const title = text(formData, "title");
  const amountPaise = parseRupeesToPaise(text(formData, "amount"));
  const paidBy = text(formData, "paidBy");
  const categoryValue = text(formData, "category");
  const spentAt = text(formData, "spentAt");
  const notes = text(formData, "notes");
  const splitAmong = formData
    .getAll("splitAmong")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const uniqueSplit = [...new Set(splitAmong)];

  if (!groupId || title.length === 0) {
    return { error: "Add a title for the expense.", message: null };
  }
  if (!amountPaise) {
    return { error: "Enter an amount greater than ₹0.", message: null };
  }
  if (!paidBy) {
    return { error: "Choose who paid.", message: null };
  }
  if (uniqueSplit.length === 0) {
    return { error: "Select at least one person to split with.", message: null };
  }
  if (!DATE_PATTERN.test(spentAt)) {
    return { error: "Choose a valid date.", message: null };
  }
  if (!isCategory(categoryValue)) {
    return { error: "Choose a category.", message: null };
  }

  const shares = splitEqually(amountPaise, uniqueSplit);
  const splits = Object.entries(shares).map(([userId, sharePaise]) => ({
    user_id: userId,
    share_paise: sharePaise,
  }));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_expense", {
    p_group_id: groupId,
    p_title: title,
    p_amount_paise: amountPaise,
    p_paid_by: paidBy,
    p_category: categoryValue,
    p_spent_at: spentAt,
    p_notes: notes || null,
    p_splits: splits,
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

  revalidateGroup(groupId);
  redirect(`/dashboard/groups/${groupId}?added=1`);
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

  if (!groupId || !fromUser || !toUser || fromUser === toUser) {
    return { error: "Choose who paid whom.", message: null };
  }
  if (!amountPaise) {
    return { error: "Enter an amount greater than ₹0.", message: null };
  }
  if (!["upi", "cash", "bank_transfer", "other"].includes(method)) {
    return { error: "Choose a payment method.", message: null };
  }

  const supabase = await createSupabaseServerClient();
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

  if (!expenseId || !groupId) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("expenses").delete().eq("id", expenseId);

  revalidateGroup(groupId);
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
