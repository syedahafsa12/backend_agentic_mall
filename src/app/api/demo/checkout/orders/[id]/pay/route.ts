import { NextResponse } from "next/server";
import { processPayment } from "@/server/financial/paymentService";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await processPayment(params.id);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
