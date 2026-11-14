"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  SparklesIcon,
  UsersRoundIcon,
  WalletIcon,
} from "lucide-react";

import { useSidebarCollapsed } from "@/components/layout/sidebar-store";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/dashboard/groups", label: "Groups", icon: UsersRoundIcon },
  { href: "/dashboard/activity", label: "Activity", icon: ActivityIcon },
  { href: "/dashboard/people", label: "People", icon: WalletIcon },
];

function isActivePath(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

interface SidebarNavProps {
  onNavigate?: () => void;
  /** Icon-only rail on desktop. Labels stay available to screen readers. */
  compact?: boolean;
}

export function SidebarNav({ onNavigate, compact = false }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className={cn("flex flex-col gap-1.5", compact ? "p-2" : "p-3")}
    >
      {compact ? null : (
        <p className="px-3 pt-2 pb-1 text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground/80 uppercase">
          Workspace
        </p>
      )}
      {navItems.map((item, index) => {
        const isActive = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            title={compact ? item.label : undefined}
            style={{ animationDelay: `${index * 45}ms` }}
            className={cn(
              "sn-enter group relative flex items-center overflow-hidden rounded-xl text-sm font-medium transition-all duration-200",
              compact ? "justify-center px-0 py-3" : "gap-3 px-3 py-2.5",
              isActive
                ? "bg-linear-to-r from-primary to-brand text-white shadow-lg shadow-brand/25"
                : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
            )}
          >
            {isActive ? (
              <span
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.35),transparent_55%)]"
              />
            ) : null}
            <span
              className={cn(
                "relative flex items-center justify-center rounded-lg transition-colors",
                compact ? "size-8" : "size-7",
                isActive
                  ? "bg-white/15 text-white"
                  : "bg-foreground/[0.04] text-muted-foreground group-hover:text-foreground",
              )}
            >
              <item.icon className={compact ? "size-5" : "size-4"} aria-hidden />
            </span>
            <span className={cn("relative", compact && "sr-only")}>
              {item.label}
            </span>
            {isActive && !compact ? (
              <span
                aria-hidden
                className="relative ml-auto size-1.5 rounded-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.9)]"
              />
            ) : null}
          </Link>
        );
      })}

      {compact ? (
        <span aria-hidden className="mx-2 my-2 h-px bg-border/60" />
      ) : (
        <p className="mt-4 px-3 pt-2 pb-1 text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground/80 uppercase">
          Account
        </p>
      )}
      <Link
        href="/dashboard/settings"
        onClick={onNavigate}
        aria-current={
          pathname.startsWith("/dashboard/settings") ? "page" : undefined
        }
        title={compact ? "Settings" : undefined}
        className={cn(
          "group flex items-center rounded-xl text-sm font-medium transition-all duration-200",
          compact ? "justify-center px-0 py-3" : "gap-3 px-3 py-2.5",
          pathname.startsWith("/dashboard/settings")
            ? "bg-brand/10 text-brand ring-1 ring-brand/15"
            : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-lg bg-foreground/[0.04]",
            compact ? "size-8" : "size-7",
          )}
        >
          <SettingsIcon
            className={compact ? "size-5" : "size-4"}
            aria-hidden
          />
        </span>
        <span className={cn(compact && "sr-only")}>Settings</span>
      </Link>
    </nav>
  );
}

export function DashboardSidebar() {
  const collapsed = useSidebarCollapsed();

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-18 items-center",
          collapsed ? "justify-center px-2" : "px-5",
        )}
      >
        <Link
          href="/dashboard"
          aria-label="SplitNest dashboard"
          className="sn-focus-ring rounded-xl"
        >
          <Logo showText={!collapsed} />
        </Link>
      </div>
      <div className="sn-scrollbar flex-1 overflow-y-auto">
        <SidebarNav compact={collapsed} />
      </div>
      {collapsed ? null : (
        <div className="p-3">
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-brand/10 to-transparent p-3.5 ring-1 ring-brand/15">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-8 -right-6 size-20 rounded-full bg-brand/25 blur-2xl"
            />
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brand">
              <SparklesIcon className="size-3.5" aria-hidden />
              India-first
            </p>
            <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground">
              UPI-ready settlements, Indian numbering, and zero money held by
              SplitNest.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
