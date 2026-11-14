"use client";

import { Suspense, type ReactNode } from "react";

import { MobileBottomNav } from "@/components/layout/dashboard-sidebar";
import { useSidebarCollapsed } from "@/components/layout/sidebar-store";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
}

export function DashboardShell({
  sidebar,
  topbar,
  children,
}: DashboardShellProps) {
  const collapsed = useSidebarCollapsed();

  return (
    <div className="sn-aurora flex min-h-svh w-full">
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 p-3 transition-[width] duration-300 ease-out md:flex motion-reduce:transition-none",
          collapsed ? "w-[5.5rem]" : "w-[17.5rem]",
        )}
      >
        <div className="sn-glass flex h-full w-full flex-col overflow-hidden rounded-3xl">
          {sidebar}
        </div>
      </aside>

      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        {topbar}
        <main className="mx-auto w-full max-w-[88rem] flex-1 px-4 pt-6 pb-28 sm:px-6 md:px-10 md:pt-10 md:pb-12">
          {children}
        </main>
      </div>

      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    </div>
  );
}
