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
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1.5 p-3">
      <p className="px-3 pt-2 pb-1 text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground/80 uppercase">
        Workspace
      </p>
      {navItems.map((item, index) => {
        const isActive = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            style={{ animationDelay: `${index * 45}ms` }}
            className={cn(
              "sn-enter group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-linear-to-r from-primary to-brand text-white shadow-lg shadow-brand/25"
                : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
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
                "relative flex size-7 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-white/15 text-white"
                  : "bg-foreground/[0.04] text-muted-foreground group-hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
            </span>
            <span className="relative">{item.label}</span>
            {isActive ? (
              <span
                aria-hidden
                className="relative ml-auto size-1.5 rounded-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.9)]"
              />
            ) : null}
          </Link>
        );
      })}

      <p className="mt-4 px-3 pt-2 pb-1 text-[0.65rem] font-semibold tracking-[0.18em] text-muted-foreground/80 uppercase">
        Account
      </p>
      <Link
        href="/dashboard/settings"
        onClick={onNavigate}
        aria-current={
          pathname.startsWith("/dashboard/settings") ? "page" : undefined
        }
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          pathname.startsWith("/dashboard/settings")
            ? "bg-brand/10 text-brand ring-1 ring-brand/15"
            : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
        )}
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-foreground/[0.04]">
          <SettingsIcon className="size-4" />
        </span>
        Settings
      </Link>
    </nav>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around gap-1 rounded-2xl border border-border/60 bg-card/85 px-1.5 py-1.5 shadow-2xl shadow-foreground/15 backdrop-blur-xl md:hidden"
    >
      {navItems.map((item) => {
        const isActive = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[0.65rem] font-medium transition-colors",
              isActive
                ? "bg-linear-to-br from-primary to-brand text-white shadow-md shadow-brand/25"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            )}
          >
            <item.icon className="size-5" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardSidebar() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-18 items-center px-5">
        <Link
          href="/"
          aria-label="SplitNest home"
          className="sn-focus-ring rounded-xl"
        >
          <Logo />
        </Link>
      </div>
      <div className="sn-scrollbar flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
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
    </div>
  );
}
