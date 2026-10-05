import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAuthClient } from "@/server/auth/client";

const schema = z.object({ email: z.string().email() });

/**
 * Always returns ok, whether or not the email has an account — never lets a
 * caller enumerate registered addresses. Supabase sends the reset email
 * itself (requires the project's redirect URL allow-list to include
 * APP_BASE_URL/reset-password, see Supabase Auth settings).
 */
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  await getSupabaseAuthClient().auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${base}/reset-password`,
  });

  return NextResponse.json({ ok: true });
}
