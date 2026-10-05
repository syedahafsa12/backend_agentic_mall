import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, UnauthorizedError } from "@/server/auth/session";
import { getMerchantById } from "@/server/merchants/repository";
import { buildConnector } from "@/server/connectors/factory";

/** Merchant-owner only — the dashboard's product list, fetched live through the same connector the agent uses (no separate/duplicated product store). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthenticatedUser(req);
    const merchant = await getMerchantById(params.id);
    if (!merchant || merchant.owner_id !== user.id) return NextResponse.json({ error: "You do not own this merchant." }, { status: 403 });

    try {
      const offers = await buildConnector(merchant).searchProducts({ query: "" });
      return NextResponse.json({ offers });
    } catch (err) {
      return NextResponse.json({ error: `Connector call failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 502 });
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
