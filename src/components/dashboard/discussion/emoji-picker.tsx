"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SmilePlusIcon } from "lucide-react";

import { EMOJI_CATEGORIES } from "@/lib/emoji";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  /** Accessible name for the trigger and the popover. */
  label?: string;
  /** Show a short "React" caption next to the icon (expense-level bar). */
  showLabel?: boolean;
  className?: string;
}

/**
 * A lightweight emoji popover. The five quick reactions stay one tap away;
 * this exposes the rest without adding an emoji package to the bundle.
 */
export function EmojiPicker({
  onSelect,
  disabled = false,
  label = "More reactions",
  showLabel = false,
  className,
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function choose(emoji: string) {
    setOpen(false);
    onSelect(emoji);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={label}
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-medium text-muted-foreground/80 transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
      >
        <SmilePlusIcon className="size-3.5" aria-hidden />
        {showLabel ? <span>React</span> : <span className="sr-only">{label}</span>}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose a reaction"
          className="absolute bottom-full left-0 z-50 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border/60 bg-card/98 p-2.5 shadow-xl shadow-foreground/15 backdrop-blur-xl"
        >
          <div className="max-h-72 space-y-2.5 overflow-y-auto pr-0.5">
            {EMOJI_CATEGORIES.map((category) => {
              const headingId = `${panelId}-${category.id}`;
              return (
                <section key={category.id} aria-labelledby={headingId}>
                  <h3
                    id={headingId}
                    className="px-1 pb-1 text-[0.62rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase"
                  >
                    {category.label}
                  </h3>
                  <div className="grid grid-cols-8 gap-0.5">
                    {category.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => choose(emoji)}
                        disabled={disabled}
                        aria-label={`React with ${emoji}`}
                        title={emoji}
                        className="flex size-8 items-center justify-center rounded-lg text-lg leading-none transition-colors hover:bg-foreground/[0.07] focus-visible:bg-foreground/[0.07] focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-50"
                      >
                        <span aria-hidden>{emoji}</span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
