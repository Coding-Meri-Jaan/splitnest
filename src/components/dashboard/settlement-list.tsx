import { Trash2Icon } from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { ConfirmSubmitButton } from "@/components/shared/confirm-submit-button";
import { deleteSettlementAction } from "@/lib/data/actions";
import { formatDate } from "@/lib/format";
import { canEditRow, type GroupRole } from "@/lib/roles";
import type { SettlementView } from "@/types";

const METHOD_LABELS: Record<SettlementView["method"], string> = {
  upi: "UPI",
  cash: "Cash",
  bank_transfer: "Bank transfer",
  other: "Other",
};

interface SettlementListProps {
  settlements: SettlementView[];
  currentUserId: string;
  /** The signed-in user's role in the group that produced these rows. */
  role: GroupRole | null;
}

export function SettlementList({
  settlements,
  currentUserId,
  role,
}: SettlementListProps) {
  if (settlements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing settled yet. Record a payment once money changes hands.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {settlements.map((settlement) => {
        const canDelete = canEditRow(
          role,
          settlement.createdById === currentUserId,
        );

        return (
          <li
            key={settlement.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-card/50 px-3 py-2.5 transition-colors hover:border-brand/20 hover:bg-brand/[0.03]"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-sm">
                <span className="font-semibold">{settlement.fromName}</span>{" "}
                <span className="text-muted-foreground">paid</span>{" "}
                <span className="font-semibold">{settlement.toName}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(settlement.date)} · {METHOD_LABELS[settlement.method]}
                {settlement.note ? ` · ${settlement.note}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Amount value={settlement.amount} signed={false} className="text-sm" />
              {canDelete ? (
                <form action={deleteSettlementAction}>
                  <input type="hidden" name="settlementId" value={settlement.id} />
                  <input type="hidden" name="groupId" value={settlement.groupId} />
                  <ConfirmSubmitButton
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete settlement"
                    confirmMessage={`Delete the ${settlement.fromName} → ${settlement.toName} settlement? Balances will update.`}
                  >
                    <Trash2Icon />
                  </ConfirmSubmitButton>
                </form>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
