import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const schema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  password: z.string().min(8),
});

/**
 * Completes a password-reset recovery: the browser lands on /reset-password
 * with Supabase's recovery tokens in the URL hash fragment (never sent to
 * any server automatically), reads them client-side, and posts them here
 * once — this route exchanges them for a session and sets the new password.
 */
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { accessToken, refreshToken, password } = parsed.data;

  // A fresh client per request — never the shared singleton from
  // src/server/auth/client.ts, which must stay session-less since it's
  // reused across concurrent requests (setSession would leak between them).
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: sessionError } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (sessionError) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });

  const { error } = await client.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
