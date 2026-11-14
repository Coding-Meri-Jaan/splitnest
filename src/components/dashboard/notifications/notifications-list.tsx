"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AtSignIcon,
  BellOffIcon,
  CheckCircle2Icon,
  ClockIcon,
  MessageCircleIcon,
  PieChartIcon,
  ReplyIcon,
  SmilePlusIcon,
  XCircleIcon,
} from "lucide-react";

import { SubmitButton } from "@/components/auth/submit-button";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/data/discussion-actions";
import { notificationText } from "@/lib/discussion";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationKind, NotificationView } from "@/types";

const KIND_ICONS: Record<NotificationKind, typeof MessageCircleIcon> = {
  expense_comment: MessageCircleIcon,
  comment_reply: ReplyIcon,
  mention: AtSignIcon,
  expense_reaction: SmilePlusIcon,
  poll_created: PieChartIcon,
  poll_deadline: ClockIcon,
  poll_closed: CheckCircle2Icon,
  poll_cancelled: XCircleIcon,
};

interface NotificationsListProps {
  items: NotificationView[];
  /** False when migration 0006 has not been applied yet. */
  available: boolean;
}

export function NotificationsList({
  items,
  available,
}: NotificationsListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unread = items.filter((item) => !item.read).length;

  function open(item: NotificationView) {
    if (!item.href) return;

    const formData = new FormData();
    formData.set("notificationId", item.id);

    startTransition(async () => {
      await markNotificationReadAction(formData);
      router.push(item.href ?? "/dashboard/notifications");
    });
  }

  if (!available) {
    return (
      <div className="sn-surface rounded-2xl border border-dashed border-border/70 px-5 py-10 text-center">
        <BellOffIcon className="mx-auto size-8 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm font-medium">Notifications are not set up yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Run the latest database migration to start receiving comment,
          mention, reaction, and poll updates.
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="sn-surface rounded-2xl border border-dashed border-border/70 px-5 py-10 text-center">
        <BellOffIcon className="mx-auto size-8 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm font-medium">You&apos;re all caught up</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Mentions, replies, reactions, and poll updates will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {unread > 0
            ? `${unread} unread ${unread === 1 ? "update" : "updates"}`
            : "Everything is read"}
        </p>
        {unread > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <SubmitButton
              className="w-auto"
              variant="outline"
              pendingLabel="Marking…"
            >
              Mark all as read
            </SubmitButton>
          </form>
        ) : null}
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const Icon = KIND_ICONS[item.kind];
          const text = notificationText(
            item.kind,
            item.actorName,
            item.expenseTitle,
            item.reactionEmoji,
            item.pollTitle,
          );

          return (
            <li key={item.id}>
              <Button
                variant="ghost"
                disabled={!item.href || pending}
                onClick={() => open(item)}
                className={cn(
                  "h-auto w-full items-start justify-start gap-3 rounded-2xl border px-3.5 py-3 text-left font-normal whitespace-normal",
                  item.read
                    ? "border-border/50 bg-card/50"
                    : "border-brand/25 bg-brand/[0.045]",
                  item.href ? "" : "cursor-default opacity-70",
                )}
              >
                <span className="relative mt-0.5 shrink-0">
                  <MemberAvatar name={item.actorName} size="sm" />
                  <span
                    aria-hidden
                    className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border border-background bg-card"
                  >
                    <Icon className="size-2.5 text-brand" />
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span
                      className={cn(
                        "text-sm leading-snug",
                        item.read ? "font-medium" : "font-semibold",
                      )}
                    >
                      {text}
                    </span>
                    {!item.read ? (
                      <span className="size-1.5 rounded-full bg-brand" aria-label="Unread" />
                    ) : null}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.68rem] text-muted-foreground">
                    {item.groupName ? (
                      <span className="inline-flex items-center gap-1">
                        <span aria-hidden>👥</span>
                        {item.groupName}
                      </span>
                    ) : null}
                    <span aria-hidden>·</span>
                    <span>{formatDateTime(item.createdAt)}</span>
                  </span>
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
