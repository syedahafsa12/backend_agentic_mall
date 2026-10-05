import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser, UnauthorizedError } from "@/server/auth/session";
import { getMerchantById } from "@/server/merchants/repository";
import { getMerchantPolicies, upsertMerchantPolicies } from "@/server/merchants/policies";

/** Merchant-owner only — see docs/api/needed-from-hafsa.md item 3. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthenticatedUser(req);
    const merchant = await getMerchantById(params.id);
    if (!merchant || merchant.owner_id !== user.id) return NextResponse.json({ error: "You do not own this merchant." }, { status: 403 });

    const policies = await getMerchantPolicies(params.id);
    return NextResponse.json(policies);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

const schema = z.object({
  shipping: z.record(z.unknown()).optional(),
  returns: z.record(z.unknown()).optional(),
  warranty: z.record(z.unknown()).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthenticatedUser(req);
    const merchant = await getMerchantById(params.id);
    if (!merchant || merchant.owner_id !== user.id) return NextResponse.json({ error: "You do not own this merchant." }, { status: 403 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    const policies = await upsertMerchantPolicies(params.id, parsed.data);
    return NextResponse.json(policies);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
