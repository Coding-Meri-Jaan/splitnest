import { describe, expect, it } from "vitest";

import {
  REACTION_EMOJIS,
  buildMentionPattern,
  findMentionedMembers,
  isReactionEmoji,
  mentionSegments,
  notificationText,
  summarizeReactions,
} from "@/lib/discussion";

const members = [
  { id: "u1", name: "Rishabh Sharma" },
  { id: "u2", name: "Ana Maria" },
  { id: "u3", name: "Dev" },
];

describe("isReactionEmoji", () => {
  it("accepts the supported reactions and rejects everything else", () => {
    for (const emoji of REACTION_EMOJIS) {
      expect(isReactionEmoji(emoji)).toBe(true);
    }
    expect(isReactionEmoji("🔥")).toBe(false);
    expect(isReactionEmoji("")).toBe(false);
  });
});

describe("summarizeReactions", () => {
  it("orders reactions, counts people, and marks the current user", () => {
    const summary = summarizeReactions(
      [
        { emoji: "❤️", userId: "u2", userName: "Ana Maria" },
        { emoji: "❤️", userId: "u3", userName: "Dev" },
        { emoji: "👍", userId: "u1", userName: "Rishabh Sharma" },
        { emoji: "🔥", userId: "u1", userName: "Rishabh Sharma" },
      ],
      "u2",
    );

    expect(summary.map((item) => item.emoji)).toEqual(["👍", "❤️"]);
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
  });
});
