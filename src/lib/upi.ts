export interface UpiPaymentRequest {
  upiId: string;
  payeeName: string;
  amountRupees: number;
  note?: string;
}

/**
 * Builds a UPI deep link that opens GPay / PhonePe / Paytm with the amount
 * pre-filled. This only opens the user's payment app - SplitNest never sees
 * or moves money.
 */
export function buildUpiUri({
  upiId,
  payeeName,
  amountRupees,
  note,
}: UpiPaymentRequest): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    cu: "INR",
    am: amountRupees.toFixed(2),
  });

  if (note) {
    params.set("tn", note);
  }

  return `upi://pay?${params.toString()}`;
}
