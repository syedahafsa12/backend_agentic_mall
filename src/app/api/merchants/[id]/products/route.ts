import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, UnauthorizedError } from "@/server/auth/session";
import { getMerchantById } from "@/server/merchants/repository";
import { buildConnector } from "@/server/connectors/factory";

/**
 * Generic per-merchant product listing — docs/api/needed-from-hafsa.md item 2.
 * Calls the merchant's own connector (REST/MCP/web — whichever it's
 * configured with) the same way the shopping agent does, rather than
 * special-casing the three demo stores' own catalog routes.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthenticatedUser(req);
    const merchant = await getMerchantById(params.id);
    if (!merchant || merchant.owner_id !== user.id) return NextResponse.json({ error: "You do not own this merchant." }, { status: 403 });

    try {
      const connector = buildConnector(merchant);
      const offers = await connector.searchProducts({ query: "" });
      const products = offers.map((o) => ({
        id: o.productId,
        name: o.title,
        price: o.price.amount,
        currency: o.price.currency,
        inStock: o.availability.inStock,
      }));
      return NextResponse.json({ count: products.length, products });
    } catch {
      // The connector couldn't be reached (site down, no sync job yet for a
      // freshly-connected arbitrary website) — not an error for the owner,
      // just nothing synced yet.
      return NextResponse.json({ count: 0, products: [], synced: false });
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
