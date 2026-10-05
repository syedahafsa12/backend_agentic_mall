// Invoices are a computed view over real order+customer+payment data, not a
// separately-stored document — the numbers can never drift from the ledger
// because there's only one source of them.
import { queryOne } from "@/server/db/pool";

export async function getInvoice(orderId: string) {
  const order = await queryOne<{
    id: string; order_number: string; customer_id: string; currency: string;
    items: { name: string; sku: string; quantity: number; unitPrice: number }[];
    subtotal: string; shipping: string; tax_jurisdiction: string; tax_rate: string; tax_amount: string; total: string; status: string; created_at: string;
  }>(`select * from demo_orders where id = $1`, [orderId]);
  if (!order) return null;

  const customer = await queryOne<{ name: string; email: string; city: string; region: string; postal_code: string; country: string }>(
    `select * from demo_customers where id = $1`, [order.customer_id],
  );
  const payment = await queryOne<{ status: string }>(`select status from demo_payments where order_id = $1 order by created_at desc limit 1`, [orderId]);

  return {
    invoiceNumber: `INV-${order.order_number.replace(/^ORD-/, "")}`,
    orderNumber: order.order_number,
    issuedAt: order.created_at,
    currency: order.currency,
    customer,
    items: order.items,
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    taxJurisdiction: order.tax_jurisdiction,
    taxRate: Number(order.tax_rate),
    taxAmount: Number(order.tax_amount),
    total: Number(order.total),
    paymentStatus: payment?.status === "succeeded" ? "Paid" : order.status === "refunded" ? "Refunded" : order.status === "partially_refunded" ? "Partially refunded" : "Unpaid",
  };
}
