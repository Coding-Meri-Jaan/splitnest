import type { SettlementView } from "@/types";

export const SETTLEMENT_METHOD_LABELS: Record<
  SettlementView["method"],
  string
> = {
  upi: "UPI",
  cash: "Cash",
  bank_transfer: "Bank transfer",
  other: "Other",
};
