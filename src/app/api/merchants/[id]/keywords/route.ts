import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser, UnauthorizedError } from "@/server/auth/session";
import { getMerchantById } from "@/server/merchants/repository";
import { addMerchantKeyword, KNOWN_PRODUCT_TYPES, listMerchantKeywords } from "@/server/merchants/keywords";

const createSchema = z.object({ keyword: z.string().min(1).max(60), resolvedType: z.enum(KNOWN_PRODUCT_TYPES as [string, ...string[]]).optional() });

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthenticatedUser(req);
    const merchant = await getMerchantById(params.id);
    if (!merchant || merchant.owner_id !== user.id) return NextResponse.json({ error: "You do not own this merchant." }, { status: 403 });
    return NextResponse.json({ keywords: await listMerchantKeywords(params.id) });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

/** Keywords help the Agent discover this merchant's existing products for a query that already implies one of its real product types — they can never reassign a product's category (see resolveKeywordType). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuthenticatedUser(req);
    const merchant = await getMerchantById(params.id);
    if (!merchant || merchant.owner_id !== user.id) return NextResponse.json({ error: "You do not own this merchant." }, { status: 403 });

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    const keyword = await addMerchantKeyword(params.id, parsed.data.keyword, parsed.data.resolvedType);
    return NextResponse.json({ keyword }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof Error && /duplicate key/i.test(err.message)) return NextResponse.json({ error: "That keyword already exists for this merchant." }, { status: 409 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
