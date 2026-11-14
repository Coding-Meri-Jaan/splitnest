"use client";

import {
  useActionState,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { AtSignIcon } from "lucide-react";

import { SubmitButton } from "@/components/auth/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { Textarea } from "@/components/ui/textarea";
import { createCommentAction } from "@/lib/data/discussion-actions";
import { initialFormState, type FormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";
import type { DiscussionMember } from "@/types";

interface CommentComposerProps {
  expenseId: string;
  groupId: string;
  parentId?: string | null;
  members: DiscussionMember[];
  currentUserId: string;
  placeholder?: string;
  submitLabel?: string;
  compact?: boolean;
  onPosted?: () => void;
}

export function CommentComposer({
  expenseId,
  groupId,
  parentId = null,
  members,
  currentUserId,
  placeholder = "Ask a question or add context…",
  submitLabel = "Post comment",
  compact = false,
  onPosted,
}: CommentComposerProps) {
  const [value, setValue] = useState("");
  const [cursor, setCursor] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [state, formAction] = useActionState(
    async (previous: FormState, formData: FormData) => {
      const result = await createCommentAction(previous, formData);
      if (!result.error) {
        setValue("");
        setCursor(0);
        onPosted?.();
      }
      return result;
    },
    initialFormState,
  );

  const mention = findMentionQuery(value, cursor);
  const suggestions = mention
    ? members
        .filter((member) => member.id !== currentUserId)
        .filter((member) =>
          mention.query.length === 0
            ? true
            : member.name.toLowerCase().includes(mention.query.toLowerCase()),
        )
        .sort((a, b) => {
          const aStarts = a.name
            .toLowerCase()
            .startsWith(mention.query.toLowerCase());
          const bStarts = b.name
            .toLowerCase()
            .startsWith(mention.query.toLowerCase());
          if (aStarts !== bStarts) return aStarts ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 6)
    : [];

  function insertMention(member: DiscussionMember) {
    if (!mention) return;

    const before = value.slice(0, mention.start);
    const after = value.slice(cursor);
    const inserted = `@${member.name} `;
    const next = `${before}${inserted}${after}`;
    const nextCursor = before.length + inserted.length;

    setValue(next);
    setCursor(nextCursor);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function syncCursor(event: FormEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;
    setCursor(textarea.selectionStart ?? textarea.value.length);
  }

  return (
    <form action={formAction} className="space-y-2.5">
      <input type="hidden" name="expenseId" value={expenseId} />
      <input type="hidden" name="groupId" value={groupId} />
      {parentId ? (
        <input type="hidden" name="parentId" value={parentId} />
      ) : null}

      <FormMessage error={state.error} message={state.message} />

      <div className="relative">
        <Textarea
          ref={textareaRef}
          name="body"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setCursor(event.target.selectionStart ?? event.target.value.length);
          }}
          onSelect={syncCursor}
          onClick={syncCursor}
          onKeyUp={syncCursor}
          placeholder={placeholder}
          maxLength={2000}
          rows={compact ? 2 : 3}
          className={cn(compact ? "min-h-16 text-sm" : "min-h-24")}
          required
        />

        {mention && suggestions.length > 0 ? (
          <div className="absolute inset-x-2 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border/60 bg-card/98 shadow-xl shadow-foreground/15 backdrop-blur-xl">
            <p className="border-b border-border/50 px-3 py-1.5 text-[0.65rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              Mention someone
            </p>
            <ul className="max-h-52 overflow-y-auto p-1">
              {suggestions.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertMention(member);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-foreground/[0.05] focus-visible:bg-foreground/[0.05] focus-visible:outline-none"
                  >
                    <AtSignIcon
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="truncate">{member.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.7rem] text-muted-foreground">
          <AtSignIcon className="mr-1 inline size-3" aria-hidden />
          Type @ to mention a member
          <span className="ml-2 tabular-nums">
            {value.length}/{2000}
          </span>
        </p>
        <SubmitButton
          className="w-auto"
          pendingLabel="Posting…"
          disabled={value.trim().length === 0}
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}

interface MentionQuery {
  start: number;
  query: string;
}

function findMentionQuery(value: string, cursor: number): MentionQuery | null {
  const before = value.slice(0, cursor);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;

  const previous = at > 0 ? before[at - 1] : "";
  if (previous && /[\p{L}\p{N}_]/u.test(previous)) return null;

  const query = before.slice(at + 1);
  if (query.includes("\n") || query.length > 40) return null;

  return { start: at, query };
}
