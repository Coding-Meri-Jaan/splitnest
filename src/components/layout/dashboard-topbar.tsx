"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BellIcon,
  ChevronDownIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
  SettingsIcon,
} from "lucide-react";

import { SidebarNav } from "@/components/layout/dashboard-sidebar";
import { SearchSuggest } from "@/components/search/search-suggest";
import { Logo } from "@/components/shared/logo";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

interface DashboardTopbarProps {
  user: {
    fullName: string;
    email: string;
  };
}

export function DashboardTopbar({ user }: DashboardTopbarProps) {
  const [open, setOpen] = useState(false);
  const logoutForm = useRef<HTMLFormElement>(null);
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const label = user.fullName || "Your account";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/50 bg-background/55 px-4 backdrop-blur-xl md:px-8">
      {/*
        Submit the server action through a real form. Calling the action
        directly from onClick can race with the menu closing and leave the
        session cookies behind, which made "Sign out" appear to do nothing.
      */}
      <form ref={logoutForm} action={logoutAction} className="hidden" />
      <Sheet open={open} onOpenChange={(next) => setOpen(next)}>
        <SheetTrigger
          aria-label="Open navigation"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "md:hidden"
          )}
        >
          <MenuIcon />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border/60">
            <SheetTitle className="flex items-center">
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <Link href="/dashboard" aria-label="SplitNest dashboard" className="md:hidden">
        <Logo showText={false} />
      </Link>

      <Link
        href="/dashboard/search"
        aria-label="Search"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground sm:hidden"
        )}
      >
        <SearchIcon />
      </Link>

      <SearchSuggest
        key={searchQuery}
        initialQuery={searchQuery}
        ariaLabel="Search"
        inputClassName="h-9 rounded-full border-border/60 bg-card/60 shadow-none"
        className="hidden max-w-sm flex-1 sm:block"
      />

      <div className="ml-auto flex items-center gap-1.5">
        <span className="relative">
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 z-10 size-1.5 rounded-full bg-brand shadow-[0_0_8px_var(--brand)]"
          />
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "text-muted-foreground"
            )}
            aria-label="Notifications"
            disabled
          >
            <BellIcon />
          </button>
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger className="group flex items-center gap-2 rounded-full border border-transparent py-1 pr-2 pl-1 transition-colors hover:border-border/70 hover:bg-card/70 focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:outline-none">
            <MemberAvatar name={label} size="sm" />
            <span className="hidden text-sm font-medium sm:inline">{label}</span>
            <ChevronDownIcon className="hidden size-4 text-muted-foreground transition-transform group-aria-expanded:rotate-180 sm:inline" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            {/* Base UI's GroupLabel throws when it is not inside a Group. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">
                {user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
                <SettingsIcon />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  logoutForm.current?.requestSubmit();
                }}
              >
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
