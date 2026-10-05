import { NextResponse } from "next/server";
import { getInvoice } from "@/server/financial/invoiceService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const invoice = await getInvoice(params.id);
  if (!invoice) return NextResponse.json({ error: "order not found" }, { status: 404 });
  return NextResponse.json(invoice);
}
