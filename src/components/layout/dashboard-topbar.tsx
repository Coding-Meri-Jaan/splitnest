"use client";

import { useState } from "react";
import Link from "next/link";
import { BellIcon, ChevronDownIcon, LogOutIcon, MenuIcon, SearchIcon, SettingsIcon } from "lucide-react";

import { SidebarNav } from "@/components/layout/dashboard-sidebar";
import { Logo } from "@/components/shared/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { logoutAction } from "@/lib/auth/actions";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DashboardTopbarProps {
  user: {
    fullName: string;
    email: string;
  };
}

export function DashboardTopbar({ user }: DashboardTopbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
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
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center">
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <Link href="/" aria-label="SplitNest home" className="md:hidden">
        <Logo showText={false} />
      </Link>

      <div className="relative hidden max-w-sm flex-1 items-center sm:flex">
        <SearchIcon className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Search"
          placeholder="Search expenses, groups, people"
          className="pl-8"
          disabled
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon-sm" aria-label="Notifications" disabled>
          <BellIcon />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted">
            <Avatar size="sm">
              <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">
              {user.fullName}
            </span>
            <ChevronDownIcon className="hidden size-4 text-muted-foreground sm:inline" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
              <SettingsIcon />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void logoutAction();
              }}
            >
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
