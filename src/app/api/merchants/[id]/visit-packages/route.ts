import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/server/db/pool";
import { requireAuthenticatedUser, UnauthorizedError } from "@/server/auth/session";
import { getMerchantById } from "@/server/merchants/repository";
import { purchaseVisitPackage, VISIT_PACKAGE_TIERS } from "@/server/visits/packages";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const packages = await query(`select * from visit_packages where merchant_id = $1 order by created_at desc`, [params.id]);
  return NextResponse.json({ packages, tiers: VISIT_PACKAGE_TIERS });
}

const schema = z.object({ tier: z.enum(["100", "500", "1000"]) });

/** Charges the mock financial engine and creates a new package — owner only. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthenticatedUser(req);
    const merchant = await getMerchantById(params.id);
    if (!merchant || merchant.owner_id !== user.id) return NextResponse.json({ error: "You do not own this merchant." }, { status: 403 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    const result = await purchaseVisitPackage(params.id, parsed.data.tier);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
