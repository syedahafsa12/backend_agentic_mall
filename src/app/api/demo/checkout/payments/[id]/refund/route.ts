import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRefund } from "@/server/financial/refundService";

const schema = z.object({ amount: z.number().positive(), reason: z.string().min(1).default("Requested by customer") });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  try {
    const refund = await createRefund(params.id, parsed.data.amount, parsed.data.reason);
    return NextResponse.json({ refund }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
