import { NextResponse } from "next/server";
import { getPaymentDetail } from "@/server/financial/paymentService";
import { listRefundsForPayment } from "@/server/financial/refundService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const detail = await getPaymentDetail(params.id);
  if (!detail) return NextResponse.json({ error: "payment not found" }, { status: 404 });
  const refunds = await listRefundsForPayment(params.id);
  return NextResponse.json({ ...detail, refunds });
}
