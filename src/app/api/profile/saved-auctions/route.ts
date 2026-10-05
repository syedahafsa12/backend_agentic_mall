import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser, UnauthorizedError } from "@/server/auth/session";
import { listSavedAuctions, saveAuction } from "@/server/profile/repository";

const createSchema = z.object({ auctionId: z.string().uuid() });

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    return NextResponse.json({ savedAuctions: await listSavedAuctions(user.id) });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    const saved = await saveAuction(user.id, parsed.data.auctionId);
    return NextResponse.json({ saved }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
