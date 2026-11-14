"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth/user";
import {
  isMissingSchemaMessage,
  POLLS_SETUP_MESSAGE,
} from "@/lib/data/errors";
import type { FormState } from "@/lib/form-state";
import {
  MAX_POLL_OPTIONS,
  fromDateTimeLocalValue,
  isPollResultsVisibility,
  isPollSelection,
  validatePollDraft,
  type PollDraftOption,
} from "@/lib/polls";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function revalidatePolls(groupId: string, pollId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/groups/${groupId}/polls`);
  if (pollId) {
    revalidatePath(`/dashboard/groups/${groupId}/polls/${pollId}`);
    revalidatePath(`/dashboard/groups/${groupId}/polls/${pollId}/edit`);
  }
}

/**
 * Turns a database exception into something a member can act on without
 * learning the schema. The SECURITY DEFINER functions are the authority; this
 * only affects the wording.
 */
function pollErrorMessage(message: string, fallback: string): string {
  if (isMissingSchemaMessage(message)) return POLLS_SETUP_MESSAGE;

  const value = message.toLowerCase();

  if (value.includes("not allowed to create polls")) {
    return "Only editors and group admins can create polls.";
  }
  if (value.includes("not allowed to edit this poll")) {
    return "Only the poll creator or a group admin can edit this poll.";
  }
  if (value.includes("not allowed to close this poll")) {
    return "Only the poll creator or a group admin can close this poll.";
  }
  if (value.includes("not allowed to cancel this poll")) {
    return "Only the poll creator or a group admin can cancel this poll.";
  }
  if (value.includes("voting has already started")) {
    return "Voting has started, so this poll can no longer be edited.";
  }
  if (value.includes("only an open poll can be edited")) {
    return "Only a poll that is still open can be edited.";
  }
  if (value.includes("only an open poll can be cancelled")) {
    return "Only a poll that is still open can be cancelled.";
  }
  if (value.includes("this poll is closed")) {
    return "This poll is closed, so votes can no longer be changed.";
  }
  if (value.includes("voting deadline has passed")) {
    return "The voting deadline has passed.";
  }
  if (value.includes("only allows one choice")) {
    return "This poll allows only one choice.";
  }
  if (value.includes("option does not belong")) {
    return "One of those options is no longer available. Refresh and try again.";
  }
  if (value.includes("poll not found")) {
    return "That poll could not be found.";
  }
  if (
    value.includes("give the poll a title") ||
    value.includes("poll title") ||
    value.includes("description") ||
    value.includes("voting deadline in the future") ||
    value.includes("at least two options") ||
    value.includes("at most 12 options") ||
    value.includes("option needs a label") ||
    value.includes("option images") ||
    value.includes("different name")
  ) {
    // These checks already produced member-friendly sentences.
    return message;
  }

  return fallback;
}

interface ParsedPollForm {
  groupId: string;
  pollId: string;
  title: string;
  description: string;
  closesAt: string;
  selection: "single" | "multiple";
  anonymous: boolean;
  resultsVisibility: "always" | "after_vote" | "after_close";
  options: PollDraftOption[];
  error: string | null;
}

function parsePollForm(formData: FormData): ParsedPollForm {
  const groupId = text(formData, "groupId");
  const pollId = text(formData, "pollId");
  const title = text(formData, "title");
  const description = text(formData, "description");
  const closesAt = text(formData, "closesAt");
  const selectionValue = text(formData, "selection") || "single";
  const visibilityValue = text(formData, "resultsVisibility") || "after_vote";
  const anonymous = formData.get("anonymous") === "on";

  if (!isUuid(groupId)) {
    return {
      groupId,
      pollId,
      title,
      description,
      closesAt,
      selection: "single",
      anonymous,
      resultsVisibility: "after_vote",
      options: [],
      error: "That group could not be found.",
    };
  }

  if (!isPollSelection(selectionValue)) {
    return {
      groupId,
      pollId,
      title,
      description,
      closesAt,
      selection: "single",
      anonymous,
      resultsVisibility: "after_vote",
      options: [],
      error: "Choose whether members can pick one or many options.",
    };
  }

  if (!isPollResultsVisibility(visibilityValue)) {
    return {
      groupId,
      pollId,
      title,
      description,
      closesAt,
      selection: selectionValue,
      anonymous,
      resultsVisibility: "after_vote",
      options: [],
      error: "Choose when the results should become visible.",
    };
  }

  const options: PollDraftOption[] = [];
  for (let index = 0; index < MAX_POLL_OPTIONS; index += 1) {
    const label = text(formData, `optionLabel_${index}`);
    const imageUrl = text(formData, `optionImage_${index}`);
    if (label.length === 0 && imageUrl.length === 0) continue;
    options.push({ label, imageUrl: imageUrl.length > 0 ? imageUrl : null });
  }

  return {
    groupId,
    pollId,
    title,
    description,
    closesAt,
    selection: selectionValue,
    anonymous,
    resultsVisibility: visibilityValue,
    options,
    error: null,
  };
}

function optionsPayload(options: PollDraftOption[]) {
  return options.map((option) => ({
    label: option.label.trim(),
    image_url: option.imageUrl?.trim() || null,
  }));
}

export async function createPollAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUserId();

  const parsed = parsePollForm(formData);
  if (parsed.error) {
    return { error: parsed.error, message: null };
  }

  const draftError = validatePollDraft(parsed);
  if (draftError) {
    return { error: draftError, message: null };
  }

  const closesAt = fromDateTimeLocalValue(parsed.closesAt);
  if (!closesAt) {
    return { error: "Choose a voting deadline.", message: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_poll", {
    p_group_id: parsed.groupId,
    p_title: parsed.title,
    p_description: parsed.description || null,
    p_closes_at: closesAt,
    p_selection: parsed.selection,
    p_is_anonymous: parsed.anonymous,
    p_results_visibility: parsed.resultsVisibility,
    p_options: optionsPayload(parsed.options),
  });

  if (error || !data) {
    return {
      error: pollErrorMessage(
        error?.message ?? "",
        "Could not create this poll. Please try again.",
      ),
      message: null,
    };
  }

  revalidatePolls(parsed.groupId, data);
  redirect(`/dashboard/groups/${parsed.groupId}/polls/${data}?created=1`);
}

export async function updatePollAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUserId();

  const parsed = parsePollForm(formData);
  if (parsed.error) {
    return { error: parsed.error, message: null };
  }

  if (!isUuid(parsed.pollId)) {
    return { error: "That poll could not be found.", message: null };
  }

  const draftError = validatePollDraft(parsed);
  if (draftError) {
    return { error: draftError, message: null };
  }

  const closesAt = fromDateTimeLocalValue(parsed.closesAt);
  if (!closesAt) {
    return { error: "Choose a voting deadline.", message: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("update_poll", {
    p_poll_id: parsed.pollId,
    p_title: parsed.title,
    p_description: parsed.description || null,
    p_closes_at: closesAt,
    p_selection: parsed.selection,
    p_is_anonymous: parsed.anonymous,
    p_results_visibility: parsed.resultsVisibility,
    p_options: optionsPayload(parsed.options),
  });

  if (error || !data) {
    return {
      error: pollErrorMessage(
        error?.message ?? "",
        "Could not update this poll. Please try again.",
      ),
      message: null,
    };
  }

  revalidatePolls(parsed.groupId, parsed.pollId);
  redirect(`/dashboard/groups/${parsed.groupId}/polls/${parsed.pollId}?updated=1`);
}

export async function savePollVotesAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUserId();

  const groupId = text(formData, "groupId");
  const pollId = text(formData, "pollId");

  if (!isUuid(groupId) || !isUuid(pollId)) {
    return { error: "That poll could not be found.", message: null };
  }

  const optionIds = [
    ...new Set(
      formData
        .getAll("optionIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ];

  if (optionIds.some((value) => !isUuid(value))) {
    return { error: "That option could not be found.", message: null };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_poll_votes", {
    p_poll_id: pollId,
    p_option_ids: optionIds,
  });

  if (error) {
    return {
      error: pollErrorMessage(
        error.message,
        "Could not save your vote. Please try again.",
      ),
      message: null,
    };
  }

  revalidatePolls(groupId, pollId);
  return {
    error: null,
    message:
      optionIds.length === 0
        ? "Your vote was cleared."
        : "Your vote is saved. You can change it until the deadline.",
  };
}

async function changePollStatus(
  formData: FormData,
  action: "close" | "cancel",
): Promise<never> {
  await requireUserId();

  const groupId = text(formData, "groupId");
  const pollId = text(formData, "pollId");

  if (!isUuid(groupId) || !isUuid(pollId)) {
    redirect("/dashboard/groups");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc(
    action === "close" ? "close_poll" : "cancel_poll",
    { p_poll_id: pollId },
  );

  revalidatePolls(groupId, pollId);

  if (error) {
    if (isMissingSchemaMessage(error.message)) {
      redirect(`/dashboard/groups/${groupId}/polls/${pollId}?error=setup`);
    }
    redirect(`/dashboard/groups/${groupId}/polls/${pollId}?error=${action}`);
  }

  redirect(
    `/dashboard/groups/${groupId}/polls/${pollId}?${
      action === "close" ? "closed" : "cancelled"
    }=1`,
  );
}

export async function closePollAction(formData: FormData): Promise<void> {
  await changePollStatus(formData, "close");
}

export async function cancelPollAction(formData: FormData): Promise<void> {
  await changePollStatus(formData, "cancel");
}
