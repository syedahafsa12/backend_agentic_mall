import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, UnauthorizedError } from "@/server/auth/session";
import { getMerchantById } from "@/server/merchants/repository";
import { getLatestVisitPackage } from "@/server/visits/repository";

/** Merchant-owner only — the dashboard's visit-package usage panel. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthenticatedUser(req);
    const merchant = await getMerchantById(params.id);
    if (!merchant || merchant.owner_id !== user.id) return NextResponse.json({ error: "You do not own this merchant." }, { status: 403 });

    const pkg = await getLatestVisitPackage(params.id);
    return NextResponse.json({ visitPackage: pkg ?? null });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
