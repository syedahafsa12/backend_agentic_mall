import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

/**
 * Lightweight preview only — fetches the given URL and reads its <title>/meta
 * description to prefill the connect form. This is NOT domain-ownership
 * verification (that stays in src/server/merchants/verification.ts, unchanged)
 * and it is not a scrape/connector: nothing here is stored or used for
 * product data, it only pre-fills a couple of form fields so the merchant
 * isn't typing their own store name from scratch.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "url is required" }, { status: 400 });

  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return NextResponse.json({ error: "Enter a valid website URL." }, { status: 400 });
  }
  if (!/^https?:$/.test(url.protocol)) {
    return NextResponse.json({ error: "Only http/https URLs are supported." }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "AgentMallConnectPreview/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return NextResponse.json({ error: `Website responded with ${res.status}.` }, { status: 422 });

    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").first().text().trim() || url.hostname;
    const description = $('meta[name="description"]').attr("content")?.trim() ?? "";

    return NextResponse.json({ domain: url.hostname, origin: url.origin, title, description });
  } catch {
    return NextResponse.json({ error: "Couldn't reach that website. Check the URL and try again." }, { status: 422 });
  }
}
