import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser, UnauthorizedError } from "@/server/auth/session";
import { getMerchantById } from "@/server/merchants/repository";
import { deleteMerchantKeyword, KNOWN_PRODUCT_TYPES, updateMerchantKeyword } from "@/server/merchants/keywords";

const patchSchema = z.object({ keyword: z.string().min(1).max(60), resolvedType: z.enum(KNOWN_PRODUCT_TYPES as [string, ...string[]]).optional() });

async function assertOwner(req: NextRequest, merchantId: string) {
  const user = await requireAuthenticatedUser(req);
  const merchant = await getMerchantById(merchantId);
  if (!merchant || merchant.owner_id !== user.id) throw new ForbiddenError();
  return user;
}
class ForbiddenError extends Error {}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; keywordId: string } }) {
  try {
    await assertOwner(req, params.id);
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

    const keyword = await updateMerchantKeyword(params.id, params.keywordId, parsed.data.keyword, parsed.data.resolvedType);
    if (!keyword) return NextResponse.json({ error: "Keyword not found." }, { status: 404 });
    return NextResponse.json({ keyword });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: "You do not own this merchant." }, { status: 403 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; keywordId: string } }) {
  try {
    await assertOwner(req, params.id);
    await deleteMerchantKeyword(params.id, params.keywordId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: "You do not own this merchant." }, { status: 403 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
