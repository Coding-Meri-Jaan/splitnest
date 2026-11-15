import { describe, expect, it } from "vitest";

import {
  EMOJI_CATEGORIES,
  QUICK_REACTIONS,
  isReactionEmoji,
} from "@/lib/emoji";

describe("emoji catalog", () => {
  it("only contains valid single reactions", () => {
    for (const category of EMOJI_CATEGORIES) {
      for (const emoji of category.emojis) {
        expect(isReactionEmoji(emoji), `${category.id}: ${emoji}`).toBe(true);
      }
    }
  });

  it("does not repeat an emoji inside one category", () => {
    for (const category of EMOJI_CATEGORIES) {
      expect(new Set(category.emojis).size).toBe(category.emojis.length);
    }
  });

  it("keeps the five quick reactions inside the picker catalog", () => {
    const catalog = new Set(
      EMOJI_CATEGORIES.flatMap((category) => category.emojis),
    );

    for (const emoji of QUICK_REACTIONS) {
      expect(catalog.has(emoji)).toBe(true);
    }
    expect(QUICK_REACTIONS).toHaveLength(5);
  });
});
