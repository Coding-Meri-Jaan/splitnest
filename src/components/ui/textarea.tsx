import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-20 w-full min-w-0 resize-y rounded-xl border border-input bg-card/70 px-3.5 py-2.5 text-base shadow-inner shadow-foreground/[0.02] transition-all outline-none placeholder:text-muted-foreground/80 hover:border-foreground/20 focus-visible:border-brand/60 focus-visible:bg-card focus-visible:ring-4 focus-visible:ring-brand/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/20 dark:focus-visible:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
