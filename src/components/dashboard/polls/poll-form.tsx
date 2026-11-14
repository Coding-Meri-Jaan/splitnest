"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { ImageIcon, MinusIcon, PlusIcon } from "lucide-react";

import { SubmitButton } from "@/components/auth/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createPollAction, updatePollAction } from "@/lib/data/poll-actions";
import { initialFormState } from "@/lib/form-state";
import {
  MAX_POLL_OPTIONS,
  MIN_POLL_OPTIONS,
  POLL_RESULTS_DESCRIPTIONS,
  POLL_RESULTS_LABELS,
  POLL_RESULTS_VISIBILITIES,
  POLL_SELECTIONS,
  POLL_SELECTION_LABELS,
  defaultPollDeadline,
  toDateTimeLocalValue,
} from "@/lib/polls";
import type { PollView } from "@/types";

interface PollFormProps {
  groupId: string;
  /** Present when editing an existing poll instead of creating one. */
  poll?: PollView;
}

interface OptionDraft {
  label: string;
  imageUrl: string;
}

function emptyOption(): OptionDraft {
  return { label: "", imageUrl: "" };
}

function initialOptions(poll?: PollView): OptionDraft[] {
  if (!poll) {
    return [emptyOption(), emptyOption()];
  }

  const options = poll.options.map((option) => ({
    label: option.label,
    imageUrl: option.imageUrl ?? "",
  }));

  while (options.length < MIN_POLL_OPTIONS) {
    options.push(emptyOption());
  }

  return options;
}

export function PollForm({ groupId, poll }: PollFormProps) {
  const editing = Boolean(poll);
  const [state, formAction] = useActionState(
    editing ? updatePollAction : createPollAction,
    initialFormState,
  );
  const [options, setOptions] = useState<OptionDraft[]>(() =>
    initialOptions(poll),
  );
  const [visibility, setVisibility] = useState(
    poll?.resultsVisibility ?? "after_vote",
  );
  const closesAtRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();

  // Reading the clock during render is not allowed while prerendering. Fill the
  // deadline on the client so the default matches the viewer's own timezone.
  useEffect(() => {
    const input = closesAtRef.current;
    if (input && !input.value) {
      input.value = poll
        ? toDateTimeLocalValue(poll.closesAt)
        : defaultPollDeadline();
    }
  }, [poll]);

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setOptions((current) =>
      current.map((option, position) =>
        position === index ? { ...option, ...patch } : option,
      ),
    );
  }

  function addOption() {
    setOptions((current) =>
      current.length >= MAX_POLL_OPTIONS ? current : [...current, emptyOption()],
    );
  }

  function removeOption(index: number) {
    setOptions((current) =>
      current.length <= MIN_POLL_OPTIONS
        ? current
        : current.filter((_, position) => position !== index),
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="groupId" value={groupId} />
      {poll ? <input type="hidden" name="pollId" value={poll.id} /> : null}
      <FormMessage error={state.error} message={state.message} />

      <div className="space-y-2">
        <label htmlFor={`${fieldId}-title`} className="text-sm font-medium">
          Question
        </label>
        <Input
          id={`${fieldId}-title`}
          name="title"
          placeholder="Where should we eat on Friday?"
          maxLength={140}
          defaultValue={poll?.title}
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor={`${fieldId}-description`}
          className="text-sm font-medium"
        >
          Details <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id={`${fieldId}-description`}
          name="description"
          placeholder="Add context so everyone can decide quickly."
          maxLength={2000}
          defaultValue={poll?.description ?? ""}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={`${fieldId}-closes`} className="text-sm font-medium">
            Voting deadline
          </label>
          <Input
            ref={closesAtRef}
            id={`${fieldId}-closes`}
            name="closesAt"
            type="datetime-local"
            required
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor={`${fieldId}-selection`}
            className="text-sm font-medium"
          >
            How many choices?
          </label>
          <select
            id={`${fieldId}-selection`}
            name="selection"
            defaultValue={poll?.selection ?? "single"}
            className="sn-select"
          >
            {POLL_SELECTIONS.map((value) => (
              <option key={value} value={value}>
                {POLL_SELECTION_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={`${fieldId}-visibility`}
          className="text-sm font-medium"
        >
          When can everyone see the results?
        </label>
        <select
          id={`${fieldId}-visibility`}
          name="resultsVisibility"
          value={visibility}
          onChange={(event) =>
            setVisibility(event.target.value as typeof visibility)
          }
          className="sn-select"
        >
          {POLL_RESULTS_VISIBILITIES.map((value) => (
            <option key={value} value={value}>
              {POLL_RESULTS_LABELS[value]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {POLL_RESULTS_DESCRIPTIONS[visibility]}
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-card/50 px-3.5 py-3 text-sm transition-colors hover:border-brand/30 hover:bg-brand/[0.04]">
        <input
          type="checkbox"
          name="anonymous"
          defaultChecked={poll?.anonymous ?? false}
          className="mt-0.5 size-4 accent-[var(--brand)]"
        />
        <span>
          <span className="font-medium">Anonymous votes</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Everyone sees the counts, but never who picked what — including the
            creator.
          </span>
        </span>
      </label>

      <fieldset className="space-y-2">
        <legend className="flex w-full items-center justify-between gap-3 text-sm font-medium">
          <span>Options</span>
          <span className="text-xs font-normal text-muted-foreground">
            {options.length} / {MAX_POLL_OPTIONS}
          </span>
        </legend>

        <div className="space-y-2">
          {options.map((option, index) => (
            <div
              key={index}
              className="rounded-xl border border-border/60 bg-card/40 p-3"
            >
              <div className="flex items-start gap-2">
                <Input
                  name={`optionLabel_${index}`}
                  value={option.label}
                  onChange={(event) =>
                    updateOption(index, { label: event.target.value })
                  }
                  placeholder={`Option ${index + 1}`}
                  maxLength={120}
                  aria-label={`Option ${index + 1} label`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeOption(index)}
                  disabled={options.length <= MIN_POLL_OPTIONS}
                  aria-label={`Remove option ${index + 1}`}
                  className="mt-0.5 shrink-0"
                >
                  <MinusIcon />
                </Button>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <Input
                  name={`optionImage_${index}`}
                  value={option.imageUrl}
                  onChange={(event) =>
                    updateOption(index, { imageUrl: event.target.value })
                  }
                  placeholder="Image link (optional)"
                  inputMode="url"
                  aria-label={`Option ${index + 1} image link`}
                  className="h-9 text-sm"
                />
              </div>

              {option.imageUrl.trim().length > 0 ? (
                // A plain img keeps this independent of the Next image loader;
                // the URL is validated as http(s) by the server action too.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={option.imageUrl.trim()}
                  alt=""
                  className="mt-2 h-20 w-full rounded-lg object-cover"
                />
              ) : null}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addOption}
          disabled={options.length >= MAX_POLL_OPTIONS}
        >
          <PlusIcon />
          Add option
        </Button>
      </fieldset>

      <SubmitButton pendingLabel={editing ? "Saving…" : "Creating…"}>
        {editing ? "Save changes" : "Create poll"}
      </SubmitButton>
    </form>
  );
}
