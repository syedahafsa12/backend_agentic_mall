// Mock refund flow. Posts a real reversing journal entry (debit revenue,
// credit cash) so the books stay balanced after a refund, not just the
// payment's own balance field.
import { randomBytes } from "node:crypto";
import { query, queryOne } from "@/server/db/pool";
import { postJournalEntry } from "./accountingService";

function demoId(prefix: string): string { return `${prefix}_demo_${randomBytes(4).toString("hex")}`; }

interface DemoPaymentRow { id: string; order_id: string; amount: string; refunded_amount: string; status: string }

export async function createRefund(paymentId: string, amount: number, reason: string) {
  const payment = await queryOne<DemoPaymentRow>(`select * from demo_payments where id = $1`, [paymentId]);
  if (!payment) throw new Error("payment not found");
  if (payment.status !== "succeeded") throw new Error("only a succeeded payment can be refunded");

  const alreadyRefunded = Number(payment.refunded_amount);
  const total = Number(payment.amount);
  if (alreadyRefunded + amount > total) throw new Error("refund amount exceeds remaining balance");

  const order = await queryOne<{ order_number: string }>(`select order_number from demo_orders where id = $1`, [payment.order_id]);

  const refundRef = demoId("re");
  const refund = await queryOne(
    `insert into demo_refunds (refund_ref, payment_id, amount, reason, status) values ($1,$2,$3,$4,'succeeded') returning *`,
    [refundRef, paymentId, amount, reason],
  );
  if (!refund) throw new Error("failed to create refund");

  await postJournalEntry({
    reference: order?.order_number ?? refundRef,
    description: `Refund for ${order?.order_number ?? "order"} (${refundRef})`,
    lines: [
      { accountName: "Product Revenue", debit: amount },
      { accountName: "Cash / Payment Processor Receivable", credit: amount },
    ],
  });

  const newRefundedAmount = alreadyRefunded + amount;
  const fullyRefunded = newRefundedAmount >= total;
  await query(`update demo_payments set refunded_amount = $2, updated_at = now() where id = $1`, [paymentId, newRefundedAmount]);
  await query(`update demo_orders set status = $2 where id = $1`, [payment.order_id, fullyRefunded ? "refunded" : "partially_refunded"]);

  return refund;
}

export async function listRefundsForPayment(paymentId: string) {
  return query(`select * from demo_refunds where payment_id = $1 order by created_at desc`, [paymentId]);
}
