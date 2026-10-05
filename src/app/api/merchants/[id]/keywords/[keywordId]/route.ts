import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/pool";
import { requireAuthenticatedUser, UnauthorizedError } from "@/server/auth/session";
import { getMerchantById } from "@/server/merchants/repository";

export async function DELETE(req: NextRequest, { params }: { params: { id: string; keywordId: string } }) {
  try {
    const user = await requireAuthenticatedUser(req);
    const merchant = await getMerchantById(params.id);
    if (!merchant || merchant.owner_id !== user.id) return NextResponse.json({ error: "You do not own this merchant." }, { status: 403 });

    await query(`delete from merchant_keywords where id = $1 and merchant_id = $2`, [params.keywordId, params.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
