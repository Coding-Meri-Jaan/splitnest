"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "sn-sidebar-collapsed";

const listeners = new Set<() => void>();
let initialized = false;
let collapsed = false;

function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    collapsed = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    collapsed = false;
  }
}

function subscribe(listener: () => void) {
  initialize();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  initialize();
  return collapsed;
}

function getServerSnapshot(): boolean {
  return false;
}

function emit() {
  for (const listener of listeners) listener();
}

export function setSidebarCollapsed(next: boolean) {
  initialize();
  collapsed = next;

  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Ignore storage failures; the sidebar still collapses for this session.
  }

  emit();
}

export function toggleSidebar() {
  setSidebarCollapsed(!getSnapshot());
}

export function useSidebarCollapsed() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
