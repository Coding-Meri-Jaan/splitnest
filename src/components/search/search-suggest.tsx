"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  HandshakeIcon,
  LoaderCircleIcon,
  ReceiptTextIcon,
  SearchIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/format";
import type { SearchKind, SearchResult } from "@/lib/search";
import { cn } from "@/lib/utils";

const KIND_META: Record<
  SearchKind,
  { label: string; icon: typeof UsersRoundIcon; tint: string }
> = {
  group: {
    label: "Group",
    icon: UsersRoundIcon,
    tint: "sn-tint-brand",
  },
  person: {
    label: "Person",
    icon: UserRoundIcon,
    tint: "bg-sky-500/10 text-sky-600 ring-sky-500/15",
  },
  expense: {
    label: "Expense",
    icon: ReceiptTextIcon,
    tint: "bg-amber-500/10 text-amber-600 ring-amber-500/15",
  },
  settlement: {
    label: "Settlement",
    icon: HandshakeIcon,
    tint: "bg-success/10 text-success ring-success/15",
  },
};

interface SearchResponse {
  query?: string;
  total?: number;
  suggestions?: SearchResult[];
}

export interface SearchSuggestProps {
  initialQuery?: string;
  placeholder?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  /** Render the large page-style search button next to the input. */
  showSubmitButton?: boolean;
  className?: string;
  inputClassName?: string;
  submitClassName?: string;
  limit?: number;
  /** Small delay so a fast typist only triggers one lookup. */
  debounceMs?: number;
}

/**
 * Search box with live suggestions. Every keystroke is debounced into one
 * `/api/search` request, and the results can be picked with the mouse or the
 * arrow keys. Pressing Enter without a highlighted row submits the normal
 * full-results page.
 */
export function SearchSuggest({
  initialQuery = "",
  placeholder = "Search expenses, groups, people",
  ariaLabel = "Search",
  autoFocus = false,
  showSubmitButton = false,
  className,
  inputClassName,
  submitClassName,
  limit = 8,
  debounceMs = 180,
}: SearchSuggestProps) {
  const router = useRouter();
  const listId = useId();
  const blurTimer = useRef<number | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  /** Bumped when an already-filled box is focused, so it can suggest too. */
  const [lookupNonce, setLookupNonce] = useState(0);

  const trimmed = query.trim();
  const showPanel = open && trimmed.length > 0;
  const active =
    activeIndex >= 0 && activeIndex < suggestions.length
      ? suggestions[activeIndex]
      : null;

  useEffect(() => {
    if (!trimmed) return;

    const controller = new AbortController();
    let cancelled = false;

    const timer = window.setTimeout(() => {
      fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`,
        {
          signal: controller.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      )
        .then((response) => (response.ok ? response.json() : null))
        .then((data: SearchResponse | null) => {
          if (cancelled || !data) return;
          setSuggestions(
            Array.isArray(data.suggestions) ? data.suggestions : [],
          );
          setTotal(typeof data.total === "number" ? data.total : 0);
          setActiveIndex(-1);
          setOpen(true);
        })
        .catch(() => {
          // Keep whatever is on screen; the full search still works.
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed, limit, debounceMs, lookupNonce]);

  function close() {
    if (blurTimer.current) {
      window.clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setOpen(false);
    setActiveIndex(-1);
  }

  function keepOpenWhileClicking() {
    if (blurTimer.current) {
      window.clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  }

  function handleBlur() {
    // Give a click on a suggestion time to land before the panel unmounts.
    blurTimer.current = window.setTimeout(() => {
      blurTimer.current = null;
      setOpen(false);
    }, 140);
  }

  useEffect(
    () => () => {
      if (blurTimer.current) window.clearTimeout(blurTimer.current);
    },
    [],
  );

  function goTo(result: SearchResult) {
    close();
    router.push(result.href);
  }

  function handleChange(value: string) {
    setQuery(value);
    setActiveIndex(-1);

    if (value.trim()) {
      setOpen(true);
      setLoading(true);
    } else {
      setOpen(false);
      setSuggestions([]);
      setTotal(0);
      setLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (!trimmed) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) =>
        suggestions.length === 0
          ? -1
          : index >= suggestions.length - 1
            ? 0
            : index + 1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      if (!trimmed) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) =>
        suggestions.length === 0
          ? -1
          : index <= 0
            ? suggestions.length - 1
            : index - 1,
      );
      return;
    }

    if (event.key === "Enter" && active) {
      event.preventDefault();
      goTo(active);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  const searchAllHref = `/dashboard/search?q=${encodeURIComponent(trimmed)}`;

  return (
    <div className={cn("relative", className)}>
      <form
        role="search"
        action="/dashboard/search"
        className={cn(
          "relative",
          showSubmitButton && "flex flex-col gap-2 sm:flex-row",
        )}
      >
        <div className="relative flex-1">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            name="q"
            value={query}
            onChange={(event) => handleChange(event.target.value)}
            onFocus={() => {
              keepOpenWhileClicking();
              if (!query.trim()) return;
              setOpen(true);
              // A prefilled box (search page, topbar) has nothing cached yet.
              if (suggestions.length === 0) {
                setLoading(true);
                setLookupNonce((nonce) => nonce + 1);
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={ariaLabel}
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={showPanel ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={
              showPanel && active ? `${listId}-option-${activeIndex}` : undefined
            }
            autoComplete="off"
            autoFocus={autoFocus}
            enterKeyHint="search"
            className={cn("pl-10", inputClassName)}
          />
        </div>

        {showSubmitButton ? (
          <Button
            type="submit"
            className={cn("h-11 shrink-0 px-5", submitClassName)}
          >
            Search
          </Button>
        ) : null}
      </form>

      {showPanel ? (
        <div
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border/70 bg-popover/95 shadow-xl shadow-black/10 backdrop-blur-xl"
        >
          {loading && suggestions.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <LoaderCircleIcon
                aria-hidden
                className="size-4 animate-spin motion-reduce:animate-none"
              />
              Searching…
            </p>
          ) : suggestions.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="Search suggestions"
              className="max-h-80 overflow-y-auto py-1"
            >
              {suggestions.map((result, index) => {
                const meta = KIND_META[result.kind];
                const Icon = meta.icon;
                const selected = index === activeIndex;

                return (
                  <li
                    key={result.id}
                    id={`${listId}-option-${index}`}
                    role="option"
                    aria-selected={selected}
                  >
                    <button
                      type="button"
                      onClick={() => goTo(result)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        selected ? "bg-brand/[0.08]" : "hover:bg-muted/60",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl ring-1",
                          meta.tint,
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {result.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          <span className="font-medium">{meta.label}</span>
                          {" · "}
                          {result.subtitle}
                        </span>
                      </span>
                      {result.amount !== undefined ? (
                        <span className="shrink-0 text-xs font-semibold tabular-nums">
                          {formatINR(result.amount)}
                        </span>
                      ) : (
                        <ArrowRightIcon
                          aria-hidden
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No suggestions. Press Enter to search everything.
            </p>
          )}

          {total > suggestions.length ? (
            <Link
              href={searchAllHref}
              onClick={close}
              className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <span>
                See all {total} results for &ldquo;{trimmed}&rdquo;
              </span>
              <ArrowRightIcon aria-hidden className="size-3.5" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
