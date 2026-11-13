import type { CategoryId } from "@/types";

/**
 * Shared icon-tile gradients for expense categories. Kept in one place so the
 * dashboard, activity lists and group tables never drift apart.
 *
 * The full class strings must stay literal for Tailwind's scanner.
 */
export const categoryTints: Record<CategoryId, string> = {
  food: "from-rose-500/15 to-orange-500/10 text-rose-600 ring-rose-500/15 dark:text-rose-300",
  travel:
    "from-sky-500/15 to-blue-500/10 text-sky-600 ring-sky-500/15 dark:text-sky-300",
  groceries:
    "from-emerald-500/15 to-teal-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-300",
  rent: "from-violet-500/15 to-indigo-500/10 text-violet-600 ring-violet-500/15 dark:text-violet-300",
  utilities:
    "from-amber-400/20 to-orange-500/10 text-amber-600 ring-amber-500/15 dark:text-amber-300",
  entertainment:
    "from-fuchsia-500/15 to-pink-500/10 text-fuchsia-600 ring-fuchsia-500/15 dark:text-fuchsia-300",
  shopping:
    "from-pink-500/15 to-rose-500/10 text-pink-600 ring-pink-500/15 dark:text-pink-300",
  other:
    "from-slate-500/15 to-zinc-500/10 text-slate-600 ring-slate-500/15 dark:text-slate-300",
};
