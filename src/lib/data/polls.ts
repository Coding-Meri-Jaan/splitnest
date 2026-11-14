import { isMissingSchemaMessage } from "@/lib/data/errors";
import { getGroupBasics, type GroupBasics } from "@/lib/data/groups";
import { pollTiming, pollWinnerIds, percentageSplit } from "@/lib/polls";
import { canEditLedger, canManageGroup } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  GroupPollSummary,
  PollOptionView,
  PollResultsVisibility,
  PollSelection,
  PollStatus,
  PollView,
  PollVoterView,
} from "@/types";
import type { Database } from "@/types/database";

type PollRow = Database["public"]["Tables"]["polls"]["Row"];
type PollOptionRow = Database["public"]["Tables"]["poll_options"]["Row"];

interface PollResultPayload {
  status?: string;
  can_see_results?: boolean;
  has_voted?: boolean;
  my_option_ids?: string[];
  options?: { option_id?: string; count?: number }[];
  voters?: { user_id?: string; name?: string }[];
  total_voters?: number;
  total_votes?: number;
  member_count?: number;
}

function parseResults(value: unknown): PollResultPayload | null {
  if (!value || typeof value !== "object") return null;
  return value as PollResultPayload;
}

const POLL_STATUSES: PollStatus[] = ["open", "closed", "cancelled"];
const POLL_SELECTIONS: PollSelection[] = ["single", "multiple"];
const VISIBILITIES: PollResultsVisibility[] = [
  "always",
  "after_vote",
  "after_close",
];

function asStatus(value: string): PollStatus {
  return POLL_STATUSES.includes(value as PollStatus)
    ? (value as PollStatus)
    : "open";
}

function asSelection(value: string): PollSelection {
  return POLL_SELECTIONS.includes(value as PollSelection)
    ? (value as PollSelection)
    : "single";
}

function asVisibility(value: string): PollResultsVisibility {
  return VISIBILITIES.includes(value as PollResultsVisibility)
    ? (value as PollResultsVisibility)
    : "after_vote";
}

interface BuildPollInput {
  poll: PollRow;
  options: PollOptionRow[];
  names: Map<string, string>;
  currentUserId: string;
  role: GroupBasics["role"];
  groupName: string;
  results: PollResultPayload | null;
  now: Date;
}

function buildPollView({
  poll,
  options,
  names,
  currentUserId,
  role,
  groupName,
  results,
  now,
}: BuildPollInput): PollView {
  const status = asStatus(poll.status);
  const selection = asSelection(poll.selection);
  const resultsVisibility = asVisibility(poll.results_visibility);
  const isMine = poll.created_by === currentUserId;
  const canManage = isMine || canManageGroup(role);

  const myOptionIds = (results?.my_option_ids ?? []).filter(
    (id): id is string => typeof id === "string",
  );
  const hasVoted = results?.has_voted ?? myOptionIds.length > 0;
  const totalVotes = Math.max(0, results?.total_votes ?? 0);
  const voterCount = Math.max(0, results?.total_voters ?? 0);
  const memberCount = Math.max(0, results?.member_count ?? names.size);
  const canSeeResults =
    status !== "cancelled" && (results?.can_see_results ?? false);

  const countByOption = new Map<string, number>();
  for (const row of results?.options ?? []) {
    if (typeof row.option_id !== "string") continue;
    countByOption.set(row.option_id, Math.max(0, row.count ?? 0));
  }

  const sortedOptions = [...options].sort(
    (a, b) =>
      a.position - b.position ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id),
  );

  const counts = sortedOptions.map((option) =>
    canSeeResults ? countByOption.get(option.id) ?? 0 : 0,
  );
  const percentages = percentageSplit(counts);
  const winnerIds = canSeeResults
    ? pollWinnerIds(
        sortedOptions.map((option, index) => ({
          id: option.id,
          count: counts[index] ?? 0,
        })),
      )
    : [];

  const optionViews: PollOptionView[] = sortedOptions.map((option, index) => ({
    id: option.id,
    label: option.label,
    imageUrl: option.image_url,
    position: option.position,
    count: counts[index] ?? 0,
    percent: percentages[index] ?? 0,
    isMine: myOptionIds.includes(option.id),
    isWinner: winnerIds.includes(option.id),
  }));

  const voters: PollVoterView[] = canSeeResults
    ? (results?.voters ?? [])
        .map((voter) => ({
          id: typeof voter.user_id === "string" ? voter.user_id : "",
          name:
            voter.name?.trim() ||
            names.get(voter.user_id ?? "") ||
            "Former member",
        }))
        .filter((voter) => voter.id.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const timing = pollTiming(poll.closes_at, status, now);

  return {
    id: poll.id,
    groupId: poll.group_id,
    groupName,
    title: poll.title,
    description: poll.description,
    status,
    selection,
    resultsVisibility,
    anonymous: poll.is_anonymous,
    closesAt: poll.closes_at,
    closedAt: poll.closed_at,
    cancelledAt: poll.cancelled_at,
    createdAt: poll.created_at,
    createdById: poll.created_by,
    createdByName: names.get(poll.created_by) ?? "Former member",
    isMine,
    canManage,
    canEdit: canManage && status === "open" && totalVotes === 0,
    options: optionViews,
    totalVotes,
    voterCount,
    memberCount,
    turnoutPercent:
      memberCount > 0
        ? Math.min(100, Math.round((voterCount / memberCount) * 100))
        : 0,
    myOptionIds,
    hasVoted,
    canSeeResults,
    voters,
    winnerIds,
    isTie: winnerIds.length > 1,
    isClosingSoon: timing.isClosingSoon,
  };
}

async function loadResults(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  pollIds: string[],
): Promise<Map<string, PollResultPayload | null>> {
  const entries = await Promise.all(
    pollIds.map(async (pollId) => {
      const { data, error } = await supabase.rpc("poll_results", {
        p_poll_id: pollId,
      });
      return [pollId, error ? null : parseResults(data)] as const;
    }),
  );

  return new Map(entries);
}

export interface GroupPollsData {
  /** False when migration 0007 has not been applied yet. */
  available: boolean;
  error: string | null;
  group: GroupBasics;
  polls: PollView[];
  canCreate: boolean;
}

export async function getGroupPolls(
  userId: string,
  groupId: string,
): Promise<GroupPollsData | null> {
  const group = await getGroupBasics(userId, groupId);
  if (!group) return null;

  const supabase = await createSupabaseServerClient();
  const names = new Map(group.members.map((member) => [member.id, member.name]));
  const canCreate = canEditLedger(group.role);

  // Close expired polls and send due reminders before anything is rendered.
  await supabase.rpc("sync_group_polls", { p_group_id: groupId });

  const pollsResult = await supabase
    .from("polls")
    .select(
      "id, group_id, created_by, title, description, status, selection, results_visibility, is_anonymous, closes_at, closed_at, cancelled_at, deadline_reminder_sent_at, created_at, updated_at",
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (pollsResult.error) {
    if (isMissingSchemaMessage(pollsResult.error.message)) {
      return {
        available: false,
        error: null,
        group,
        polls: [],
        canCreate: false,
      };
    }
    return {
      available: true,
      error: "Could not load this group's polls. Please refresh and try again.",
      group,
      polls: [],
      canCreate,
    };
  }

  const polls = (pollsResult.data ?? []) as PollRow[];
  if (polls.length === 0) {
    return { available: true, error: null, group, polls: [], canCreate };
  }

  const pollIds = polls.map((poll) => poll.id);
  const [optionsResult, resultsByPoll] = await Promise.all([
    supabase
      .from("poll_options")
      .select("id, poll_id, label, image_url, position, created_at")
      .in("poll_id", pollIds)
      .order("position", { ascending: true }),
    loadResults(supabase, pollIds),
  ]);

  if (optionsResult.error && isMissingSchemaMessage(optionsResult.error.message)) {
    return {
      available: false,
      error: null,
      group,
      polls: [],
      canCreate: false,
    };
  }

  const optionsByPoll = new Map<string, PollOptionRow[]>();
  for (const option of (optionsResult.data ?? []) as PollOptionRow[]) {
    const bucket = optionsByPoll.get(option.poll_id) ?? [];
    bucket.push(option);
    optionsByPoll.set(option.poll_id, bucket);
  }

  const now = new Date();
  const views = polls.map((poll) =>
    buildPollView({
      poll,
      options: optionsByPoll.get(poll.id) ?? [],
      names,
      currentUserId: userId,
      role: group.role,
      groupName: group.name,
      results: resultsByPoll.get(poll.id) ?? null,
      now,
    }),
  );

  return {
    available: true,
    error: optionsResult.error
      ? "Some poll options could not be loaded. Refresh to try again."
      : null,
    group,
    polls: views,
    canCreate,
  };
}

export interface PollDetailData {
  available: boolean;
  error: string | null;
  group: GroupBasics;
  poll: PollView | null;
}

export async function getPollDetail(
  userId: string,
  groupId: string,
  pollId: string,
): Promise<PollDetailData | null> {
  const group = await getGroupBasics(userId, groupId);
  if (!group) return null;

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("sync_group_polls", { p_group_id: groupId });

  const pollResult = await supabase
    .from("polls")
    .select(
      "id, group_id, created_by, title, description, status, selection, results_visibility, is_anonymous, closes_at, closed_at, cancelled_at, deadline_reminder_sent_at, created_at, updated_at",
    )
    .eq("id", pollId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (pollResult.error) {
    if (isMissingSchemaMessage(pollResult.error.message)) {
      return { available: false, error: null, group, poll: null };
    }
    return {
      available: true,
      error: "Could not load this poll. Please refresh and try again.",
      group,
      poll: null,
    };
  }

  const poll = pollResult.data as PollRow | null;
  if (!poll) {
    return { available: true, error: null, group, poll: null };
  }

  const [optionsResult, resultsResult] = await Promise.all([
    supabase
      .from("poll_options")
      .select("id, poll_id, label, image_url, position, created_at")
      .eq("poll_id", pollId)
      .order("position", { ascending: true }),
    supabase.rpc("poll_results", { p_poll_id: pollId }),
  ]);

  if (optionsResult.error && isMissingSchemaMessage(optionsResult.error.message)) {
    return { available: false, error: null, group, poll: null };
  }

  const names = new Map(group.members.map((member) => [member.id, member.name]));
  const view = buildPollView({
    poll,
    options: (optionsResult.data ?? []) as PollOptionRow[],
    names,
    currentUserId: userId,
    role: group.role,
    groupName: group.name,
    results: resultsResult.error ? null : parseResults(resultsResult.data),
    now: new Date(),
  });

  return {
    available: true,
    error: optionsResult.error
      ? "This poll's options could not be loaded. Refresh to try again."
      : null,
    group,
    poll: view,
  };
}

/**
 * A light poll summary for the group page card. It never loads options or
 * ballots, so opening a ledger does not pay for the poll feature.
 */
export async function getGroupPollSummary(
  groupId: string,
  role: GroupBasics["role"] = null,
): Promise<GroupPollSummary> {
  const empty: GroupPollSummary = {
    available: false,
    activeCount: 0,
    completedCount: 0,
    totalCount: 0,
    nextPoll: null,
    canCreate: false,
  };

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("sync_group_polls", { p_group_id: groupId });

  const { data, error } = await supabase
    .from("polls")
    .select("id, title, status, closes_at")
    .eq("group_id", groupId)
    .order("closes_at", { ascending: true });

  if (error) {
    if (isMissingSchemaMessage(error.message)) return empty;
    return { ...empty, available: true };
  }

  const rows = data ?? [];
  const now = Date.now();
  const open = rows.filter(
    (row) => row.status === "open" && new Date(row.closes_at).getTime() > now,
  );
  const next = open[0] ?? null;

  return {
    available: true,
    activeCount: open.length,
    completedCount: rows.filter((row) => row.status !== "open").length,
    totalCount: rows.length,
    nextPoll: next
      ? { id: next.id, title: next.title, closesAt: next.closes_at }
      : null,
    canCreate: canEditLedger(role),
  };
}
