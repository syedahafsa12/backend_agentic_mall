import { NextResponse } from "next/server";
import { getFinancialAnalytics, listRecentOrders } from "@/server/financial/paymentService";

// No request params, so Next would otherwise try to statically prerender
// this at build time — before DATABASE_URL is necessarily available.
export const dynamic = "force-dynamic";

export async function GET() {
  const [analytics, recentOrders] = await Promise.all([getFinancialAnalytics(), listRecentOrders(20)]);
  return NextResponse.json({ analytics, recentOrders });
}
