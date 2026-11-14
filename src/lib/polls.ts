import type {
  PollResultsVisibility,
  PollSelection,
  PollStatus,
} from "@/types";

export const POLL_STATUSES: readonly PollStatus[] = [
  "open",
  "closed",
  "cancelled",
];

export const POLL_SELECTIONS: readonly PollSelection[] = [
  "single",
  "multiple",
];

export const POLL_RESULTS_VISIBILITIES: readonly PollResultsVisibility[] = [
  "always",
  "after_vote",
  "after_close",
];

export const POLL_STATUS_LABELS: Record<PollStatus, string> = {
  open: "Open",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const POLL_SELECTION_LABELS: Record<PollSelection, string> = {
  single: "Single choice",
  multiple: "Multiple choice",
};

export const POLL_RESULTS_LABELS: Record<PollResultsVisibility, string> = {
  always: "Always visible",
  after_vote: "After you vote",
  after_close: "When the poll closes",
};

export const POLL_RESULTS_DESCRIPTIONS: Record<PollResultsVisibility, string> = {
  always: "Everyone sees live counts while voting is open.",
  after_vote: "Counts stay hidden until a member casts a vote.",
  after_close: "Counts stay hidden until voting closes.",
};

export const MAX_POLL_OPTIONS = 12;
export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_TITLE_LENGTH = 140;
export const MAX_POLL_DESCRIPTION_LENGTH = 2000;
export const MAX_POLL_OPTION_LABEL_LENGTH = 120;

export function isPollStatus(value: string): value is PollStatus {
  return (POLL_STATUSES as readonly string[]).includes(value);
}

export function isPollSelection(value: string): value is PollSelection {
  return (POLL_SELECTIONS as readonly string[]).includes(value);
}

export function isPollResultsVisibility(
  value: string,
): value is PollResultsVisibility {
  return (POLL_RESULTS_VISIBILITIES as readonly string[]).includes(value);
}

/**
 * Whether option counts must stay hidden for this viewer. Managers and the
 * creator can always see turnout, but never individual ballots on an
 * anonymous poll.
 */
export function arePollResultsLocked(input: {
  visibility: PollResultsVisibility;
  status: PollStatus;
  hasVoted: boolean;
  isManager: boolean;
}): boolean {
  if (input.isManager) return false;
  if (input.status !== "open") return false;
  if (input.visibility === "always") return false;
  if (input.visibility === "after_vote") return !input.hasVoted;
  return true;
}

/**
 * Whole-number percentages that add up to 100 (when there is at least one
 * vote). The largest remainder gets the leftover point, so a 3-way even split
 * reads 34 / 33 / 33 instead of 33 / 33 / 33.
 */
export function percentageSplit(counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + Math.max(0, count), 0);
  if (total <= 0) return counts.map(() => 0);

  const raw = counts.map((count) => (Math.max(0, count) / total) * 100);
  const whole = raw.map((value) => Math.floor(value));
  let remaining = 100 - whole.reduce((sum, value) => sum + value, 0);

  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let cursor = 0; remaining > 0 && order.length > 0; cursor += 1) {
    whole[order[cursor % order.length].index] += 1;
    remaining -= 1;
  }

  return whole;
}

/** Every option tied for the highest non-zero count. Empty when nobody voted. */
export function pollWinnerIds(
  options: { id: string; count: number }[],
): string[] {
  const highest = options.reduce(
    (max, option) => Math.max(max, option.count),
    0,
  );
  if (highest <= 0) return [];
  return options
    .filter((option) => option.count === highest)
    .map((option) => option.id);
}

export interface PollTiming {
  label: string;
  isClosingSoon: boolean;
  isExpired: boolean;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * A short, human deadline label. It deliberately uses coarse units so the
 * text stays stable between two renders a few seconds apart.
 */
export function pollTiming(
  closesAt: string,
  status: PollStatus,
  now: Date = new Date(),
): PollTiming {
  if (status === "cancelled") {
    return { label: "Poll cancelled", isClosingSoon: false, isExpired: true };
  }
  if (status === "closed") {
    return { label: "Voting closed", isClosingSoon: false, isExpired: true };
  }

  const deadline = new Date(closesAt).getTime();
  if (!Number.isFinite(deadline)) {
    return { label: "Voting closed", isClosingSoon: false, isExpired: true };
  }

  const diff = deadline - now.getTime();
  if (diff <= 0) {
    return { label: "Voting closed", isClosingSoon: false, isExpired: true };
  }

  const isClosingSoon = diff <= DAY;

  if (diff < HOUR) {
    const minutes = Math.max(1, Math.ceil(diff / MINUTE));
    return {
      label: `Closes in ${minutes} min`,
      isClosingSoon,
      isExpired: false,
    };
  }

  if (diff < DAY) {
    const hours = Math.max(1, Math.ceil(diff / HOUR));
    return {
      label: `Closes in ${hours} ${hours === 1 ? "hour" : "hours"}`,
      isClosingSoon,
      isExpired: false,
    };
  }

  const days = Math.ceil(diff / DAY);
  return {
    label: `Closes in ${days} ${days === 1 ? "day" : "days"}`,
    isClosingSoon,
    isExpired: false,
  };
}

/** `datetime-local` value in the viewer's own timezone. */
export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parses a `datetime-local` value as local time and returns an ISO string. */
export function fromDateTimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** The same instant three days out, ready for a `datetime-local` input. */
export function defaultPollDeadline(now: Date = new Date()): string {
  return toDateTimeLocalValue(new Date(now.getTime() + 3 * DAY).toISOString());
}

export function isValidPollImageUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value.trim());
}

export interface PollDraftOption {
  label: string;
  imageUrl?: string | null;
}

export interface PollDraft {
  title: string;
  description?: string | null;
  closesAt: string;
  selection: PollSelection;
  anonymous: boolean;
  resultsVisibility: PollResultsVisibility;
  options: PollDraftOption[];
}

/**
 * Mirrors the database checks so the form can explain a problem before a
 * round-trip. The SECURITY DEFINER functions remain the authority.
 */
export function validatePollDraft(
  draft: PollDraft,
  now: Date = new Date(),
): string | null {
  const title = draft.title.trim();
  if (title.length < 3) {
    return "Give the poll a title of at least 3 characters.";
  }
  if (title.length > MAX_POLL_TITLE_LENGTH) {
    return `Keep the poll title under ${MAX_POLL_TITLE_LENGTH} characters.`;
  }

  const description = (draft.description ?? "").trim();
  if (description.length > MAX_POLL_DESCRIPTION_LENGTH) {
    return `Keep the description under ${MAX_POLL_DESCRIPTION_LENGTH} characters.`;
  }

  const deadline = fromDateTimeLocalValue(draft.closesAt);
  if (!deadline) {
    return "Choose a voting deadline.";
  }
  if (new Date(deadline).getTime() <= now.getTime()) {
    return "Choose a voting deadline in the future.";
  }

  const options = draft.options
    .map((option) => ({
      label: option.label.trim(),
      imageUrl: option.imageUrl?.trim() ?? "",
    }))
    .filter((option) => option.label.length > 0 || option.imageUrl.length > 0);

  if (options.length < MIN_POLL_OPTIONS) {
    return "Add at least two options.";
  }
  if (options.length > MAX_POLL_OPTIONS) {
    return `A poll can have at most ${MAX_POLL_OPTIONS} options.`;
  }

  for (const option of options) {
    if (option.label.length === 0) {
      return "Every option needs a label.";
    }
    if (option.label.length > MAX_POLL_OPTION_LABEL_LENGTH) {
      return `Keep each option under ${MAX_POLL_OPTION_LABEL_LENGTH} characters.`;
    }
    if (option.imageUrl.length > 0 && !isValidPollImageUrl(option.imageUrl)) {
      return "Option images must be http or https links.";
    }
  }

  const seen = new Set<string>();
  for (const option of options) {
    const key = option.label.toLowerCase();
    if (seen.has(key)) {
      return "Each option needs a different name.";
    }
    seen.add(key);
  }

  return null;
}
