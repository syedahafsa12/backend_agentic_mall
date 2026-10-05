import { NextRequest, NextResponse } from "next/server";
import { createDemoOrder, ensureDemoCustomer, type OrderItem } from "@/server/financial/paymentService";

interface Scenario {
  externalRef: string;
  customer: { name: string; email: string; country: string; region: string; city: string; postalCode: string };
  items: OrderItem[];
  shipping: number;
}

const SCENARIOS: Record<string, Scenario> = {
  nyc: {
    externalRef: "cus_demo_10482",
    customer: { name: "Sarah Mitchell", email: "sarah.mitchell@example.com", country: "US", region: "NY", city: "New York", postalCode: "10001" },
    items: [{ name: "Premium Leather Tote", sku: "LT-BLK-001", quantity: 1, unitPrice: 249.0 }],
    shipping: 15,
  },
  la: {
    externalRef: "cus_demo_20193",
    customer: { name: "Marcus Chen", email: "marcus.chen@example.com", country: "US", region: "CA", city: "Los Angeles", postalCode: "90012" },
    items: [{ name: "Wireless Noise-Cancelling Headphones", sku: "WH-NC-220", quantity: 1, unitPrice: 179.0 }],
    shipping: 9,
  },
  austin: {
    externalRef: "cus_demo_30587",
    customer: { name: "Priya Patel", email: "priya.patel@example.com", country: "US", region: "TX", city: "Austin", postalCode: "73301" },
    items: [{ name: "Ceramic Pour-Over Coffee Set", sku: "CPO-SET-04", quantity: 2, unitPrice: 42.5 }],
    shipping: 6,
  },
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const key = typeof body.scenario === "string" && body.scenario in SCENARIOS ? body.scenario : "nyc";
  const scenario = SCENARIOS[key]!;

  const customer = await ensureDemoCustomer(scenario.externalRef, scenario.customer);
  if (!customer) return NextResponse.json({ error: "failed to create customer" }, { status: 500 });

  const order = await createDemoOrder({
    customerId: (customer as { id: string }).id,
    items: scenario.items,
    shipping: scenario.shipping,
    destination: scenario.customer,
  });

  return NextResponse.json({ customer, order, scenarios: Object.keys(SCENARIOS) }, { status: 201 });
}

export async function GET() {
  return NextResponse.json({ scenarios: Object.keys(SCENARIOS) });
}
