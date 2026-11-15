import { describe, expect, it } from "vitest";

import {
  QUICK_REACTIONS,
  buildCommentTree,
  buildMentionPattern,
  findMentionedMembers,
  isNotificationKind,
  isReactionEmoji,
  mentionSegments,
  notificationText,
  summarizeReactions,
} from "@/lib/discussion";
import type { CommentView } from "@/types";

const members = [
  { id: "u1", name: "Rishabh Sharma" },
  { id: "u2", name: "Ana Maria" },
  { id: "u3", name: "Dev" },
];

describe("isReactionEmoji", () => {
  it("accepts the quick reactions and any single emoji", () => {
    for (const emoji of QUICK_REACTIONS) {
      expect(isReactionEmoji(emoji)).toBe(true);
    }
    expect(isReactionEmoji("🔥")).toBe(true);
    expect(isReactionEmoji("👀")).toBe(true);
    expect(isReactionEmoji("🇺🇸")).toBe(true);
    expect(isReactionEmoji("👨‍👩‍👧‍👦")).toBe(true);
    expect(isReactionEmoji("👍🏽")).toBe(true);
  });

  it("rejects text, empty values, and more than one emoji", () => {
    expect(isReactionEmoji("")).toBe(false);
    expect(isReactionEmoji("hello")).toBe(false);
    expect(isReactionEmoji("👍❤️")).toBe(false);
    expect(isReactionEmoji("🔥🔥")).toBe(false);
    expect(isReactionEmoji("🔥".repeat(20))).toBe(false);
  });
});

describe("summarizeReactions", () => {
  it("orders quick reactions first, then counts people and marks the current user", () => {
    const summary = summarizeReactions(
      [
        { emoji: "🔥", userId: "u1", userName: "Rishabh Sharma" },
        { emoji: "❤️", userId: "u2", userName: "Ana Maria" },
        { emoji: "❤️", userId: "u3", userName: "Dev" },
        { emoji: "👍", userId: "u1", userName: "Rishabh Sharma" },
      ],
      "u2",
    );

    expect(summary.map((item) => item.emoji)).toEqual(["👍", "❤️", "🔥"]);
    expect(summary[0]).toMatchObject({
      count: 1,
      reactedByMe: false,
      names: ["Rishabh Sharma"],
    });
    expect(summary[1]).toMatchObject({
      count: 2,
      reactedByMe: true,
      names: ["Ana Maria", "Dev"],
    });
    expect(summary[2]).toMatchObject({
      count: 1,
      reactedByMe: false,
      names: ["Rishabh Sharma"],
    });
  });

  it("ranks non-quick reactions by count, then by first appearance", () => {
    const summary = summarizeReactions(
      [
        { emoji: "🔥", userId: "u1", userName: "Rishabh Sharma" },
        { emoji: "🎯", userId: "u2", userName: "Ana Maria" },
        { emoji: "🎯", userId: "u3", userName: "Dev" },
      ],
      "u1",
    );

    expect(summary.map((item) => item.emoji)).toEqual(["🎯", "🔥"]);
  });

  it("does not double count a duplicate row for the same person", () => {
    const summary = summarizeReactions(
      [
        { emoji: "👍", userId: "u1", userName: "Rishabh Sharma" },
        { emoji: "👍", userId: "u1", userName: "Rishabh Sharma" },
      ],
      "u1",
    );

    expect(summary).toHaveLength(1);
    expect(summary[0].count).toBe(1);
    expect(summary[0].reactedByMe).toBe(true);
  });
});

describe("buildCommentTree", () => {
  function comment(
    id: string,
    parentId: string | null,
    createdAt: string,
  ): CommentView {
    return {
      id,
      expenseId: "e1",
      parentId,
      authorId: `author-${id}`,
      authorName: `Author ${id}`,
      body: id,
      createdAt,
      editedAt: null,
      isMine: false,
      canEdit: false,
      canDelete: false,
      mentions: [],
      reactions: [],
    };
  }

  it("nests replies to any depth in conversation order", () => {
    const tree = buildCommentTree([
      comment("a", null, "2026-01-01T10:00:00Z"),
      comment("b", "a", "2026-01-01T10:01:00Z"),
      comment("c", "b", "2026-01-01T10:02:00Z"),
      comment("d", "c", "2026-01-01T10:03:00Z"),
      comment("e", null, "2026-01-01T10:04:00Z"),
    ]);

    expect(tree.map((node) => node.id)).toEqual(["a", "e"]);
    expect(tree[0].replies.map((node) => node.id)).toEqual(["b"]);
    expect(tree[0].replies[0].replies[0].id).toBe("c");
    expect(tree[0].replies[0].replies[0].replies[0].id).toBe("d");
  });

  it("keeps a reply whose parent is missing instead of dropping it", () => {
    const tree = buildCommentTree([
      comment("orphan", "missing", "2026-01-01T10:00:00Z"),
    ]);

    expect(tree.map((node) => node.id)).toEqual(["orphan"]);
  });
});

describe("mentions", () => {
  it("finds full names and unique first names", () => {
    expect(findMentionedMembers("Thanks @Rishabh Sharma!", members)).toEqual([
      "u1",
    ]);
    expect(findMentionedMembers("Thanks @Rishabh!", members)).toEqual(["u1"]);
    expect(findMentionedMembers("@Ana Maria and @Dev", members)).toEqual([
      "u2",
      "u3",
    ]);
  });

  it("is case-insensitive and does not match the middle of a longer name", () => {
    expect(findMentionedMembers("@rishabh hello", members)).toEqual(["u1"]);
    expect(findMentionedMembers("@RishabhSharma", members)).toEqual([]);
    expect(findMentionedMembers("email@Rishabh", members)).toEqual([]);
  });

  it("does not invent a first-name alias when two members share it", () => {
    const duo = [
      { id: "a", name: "Sam Rao" },
      { id: "b", name: "Sam Iyer" },
    ];

    expect(findMentionedMembers("@Sam", duo)).toEqual([]);
    expect(findMentionedMembers("@Sam Rao", duo)).toEqual(["a"]);
  });

  it("builds a pattern only when there are mentionable names", () => {
    expect(buildMentionPattern([])).toBeNull();
    expect(buildMentionPattern([{ id: "x", name: "Member" }])).toBeNull();
    expect(buildMentionPattern(members)).toBeInstanceOf(RegExp);
  });

  it("splits a body into plain and mentioned runs", () => {
    expect(mentionSegments("Hi @Dev, look", members)).toEqual([
      { text: "Hi ", mentioned: false },
      { text: "@Dev", mentioned: true },
      { text: ", look", mentioned: false },
    ]);
  });
});

describe("notificationText", () => {
  it("describes each notification kind", () => {
    expect(notificationText("expense_comment", "Ana", "Dinner", null)).toBe(
      "Ana commented on “Dinner”",
    );
    expect(notificationText("comment_reply", "Ana", "Dinner", null)).toBe(
      "Ana replied to your comment on “Dinner”",
    );
    expect(notificationText("mention", "Ana", "Dinner", null)).toBe(
      "Ana mentioned you on “Dinner”",
    );
    expect(notificationText("expense_reaction", "Ana", "Dinner", "❤️")).toBe(
      "Ana reacted ❤️ “Dinner”",
    );
    expect(notificationText("comment_reaction", "Ana", "Dinner", "🔥")).toBe(
      "Ana reacted 🔥 to your comment on “Dinner”",
    );
  });

  it("describes poll events without needing an expense title", () => {
    expect(
      notificationText("poll_created", "Ana", null, null, "Where to eat?"),
    ).toBe("Ana started a poll “Where to eat?”");
    expect(
      notificationText("poll_deadline", "Ana", null, null, "Where to eat?"),
    ).toBe("Voting on “Where to eat?” closes within 24 hours");
    expect(
      notificationText("poll_closed", "Ana", null, null, "Where to eat?"),
    ).toBe("“Where to eat?” has closed — results are ready");
    expect(
      notificationText("poll_cancelled", "Ana", null, null, "Where to eat?"),
    ).toBe("Ana cancelled the poll “Where to eat?”");
  });
});

describe("isNotificationKind", () => {
  it("accepts discussion and poll kinds", () => {
    for (const kind of [
      "expense_comment",
      "comment_reply",
      "mention",
      "expense_reaction",
      "comment_reaction",
      "poll_created",
      "poll_deadline",
      "poll_closed",
      "poll_cancelled",
    ]) {
      expect(isNotificationKind(kind)).toBe(true);
    }
    expect(isNotificationKind("poll_winner")).toBe(false);
    expect(isNotificationKind("")).toBe(false);
  });
});
