import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useEmailCooldown } from "./use-email-cooldown";

const START = new Date("2026-01-01T00:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("useEmailCooldown", () => {
  it("counts down, persists across a reload, and clears itself", () => {
    const first = renderHook(() => useEmailCooldown("person@example.com"));

    expect(first.result.current.remainingSeconds).toBe(0);

    act(() => first.result.current.start(60));
    expect(first.result.current.active).toBe(true);
    expect(first.result.current.remainingSeconds).toBe(60);

    act(() => vi.advanceTimersByTime(2_000));
    expect(first.result.current.remainingSeconds).toBe(58);

    first.unmount();

    // A reload keeps the same address on the same deadline.
    const reloaded = renderHook(() => useEmailCooldown("person@example.com"));
    expect(reloaded.result.current.remainingSeconds).toBe(58);

    act(() => vi.advanceTimersByTime(60_000));
    expect(reloaded.result.current.remainingSeconds).toBe(0);
    expect(window.localStorage.length).toBe(0);

    reloaded.unmount();
  });

  it("seeds a server-reported cooldown", () => {
    const { result } = renderHook(() =>
      useEmailCooldown("person@example.com", 30),
    );

    expect(result.current.remainingSeconds).toBe(30);

    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.remainingSeconds).toBe(25);
  });

  it("keeps addresses independent", () => {
    const person = renderHook(() => useEmailCooldown("person@example.com"));
    const other = renderHook(() => useEmailCooldown("other@example.com"));

    act(() => person.result.current.start(60));

    expect(person.result.current.remainingSeconds).toBe(60);
    expect(other.result.current.remainingSeconds).toBe(0);
  });

  it("never shortens a running countdown", () => {
    const { result } = renderHook(() => useEmailCooldown("person@example.com"));

    act(() => result.current.start(60));
    act(() => vi.advanceTimersByTime(10_000));
    act(() => result.current.start(30));

    expect(result.current.remainingSeconds).toBe(50);
  });
});
