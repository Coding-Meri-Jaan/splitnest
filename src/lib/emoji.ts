/**
 * The five reactions offered at a glance. Everything else lives behind the
 * picker, so a comment does not carry an overwhelming emoji toolbar.
 *
 * Order matters: summaries render quick reactions first, in this order.
 */
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "😮"] as const;

export interface EmojiCategory {
  id: string;
  label: string;
  emojis: readonly string[];
}

/**
 * A small, curated catalog rather than a dependency. It covers the reactions
 * people actually use in an expense thread without shipping a multi-megabyte
 * emoji database to every browser.
 */
export const EMOJI_CATEGORIES: readonly EmojiCategory[] = [
  {
    id: "smileys",
    label: "Smileys",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "🤣",
      "🙂",
      "😊",
      "😇",
      "😍",
      "🥰",
      "😘",
      "😎",
      "🤩",
      "🥳",
      "😏",
      "😮",
      "😢",
      "😭",
      "😤",
      "😱",
      "🤔",
      "🤗",
      "🤭",
      "🫡",
      "😴",
      "🤯",
      "🥺",
      "😡",
      "🫠",
      "😬",
    ],
  },
  {
    id: "gestures",
    label: "Gestures",
    emojis: [
      "👍",
      "👎",
      "👏",
      "🙌",
      "🤝",
      "👋",
      "✌️",
      "🤞",
      "🫶",
      "💪",
      "🙏",
      "👀",
      "🫣",
      "🤌",
      "👉",
      "👈",
      "☝️",
      "🖐️",
      "✋",
      "🤙",
      "👊",
      "🫰",
    ],
  },
  {
    id: "hearts",
    label: "Hearts",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "💔",
      "❣️",
      "💕",
      "💖",
      "💘",
      "💝",
      "✨",
      "💯",
    ],
  },
  {
    id: "food",
    label: "Food & drink",
    emojis: ["☕", "🍕", "🍔", "🍟", "🍻", "🥂", "🍰", "🎂", "🍿", "🍎", "🍜", "🧋"],
  },
  {
    id: "fun",
    label: "Fun & symbols",
    emojis: [
      "🔥",
      "🎉",
      "🎊",
      "🏆",
      "⚽",
      "🎮",
      "🎵",
      "📌",
      "✅",
      "❌",
      "⏰",
      "🚀",
      "🌟",
      "💡",
      "💸",
      "🎯",
    ],
  },
];

const graphemeSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/**
 * A reaction must be exactly one emoji, not a sentence and not two emojis
 * glued together. Intl.Segmenter keeps ZWJ sequences (👨‍👩‍👧‍👦) and flags
 * (🇺🇸) intact as a single grapheme.
 *
 * The server action and the database both enforce this again; the client
 * check exists to give an immediate, friendly response.
 */
export function isReactionEmoji(value: string): boolean {
  const emoji = value.trim();
  if (emoji.length === 0 || emoji.length > 24) return false;

  if (graphemeSegmenter) {
    const segments = [...graphemeSegmenter.segment(emoji)];
    if (segments.length !== 1) return false;
  }

  return /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(emoji);
}
