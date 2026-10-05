// Cost Per Unique Website Visit packages — the platform's own monetization
// (trade-secret brief, MONETIZATION section): website owners buy a package,
// each unique visitor consumes one slot, the merchant disappears from the
// platform once exhausted until another package is purchased. The charge
// itself goes through the same mock financial engine as customer checkout
// (src/server/financial/*) — platform revenue is still revenue, same ledger.
import { createVisitPackage, type VisitPackageRow } from "./repository";
import { postJournalEntry } from "@/server/financial/accountingService";
import { queryOne } from "@/server/db/pool";

export interface VisitPackageTier {
  key: "100" | "500" | "1000";
  visits: number;
  price: number;
}

export const VISIT_PACKAGE_TIERS: VisitPackageTier[] = [
  { key: "100", visits: 100, price: 99 },
  { key: "500", visits: 500, price: 375 },
  { key: "1000", visits: 1000, price: 497 },
];

export async function purchaseVisitPackage(merchantId: string, tierKey: string): Promise<{ package: VisitPackageRow; journalEntryNumber: string }> {
  const tier = VISIT_PACKAGE_TIERS.find((t) => t.key === tierKey);
  if (!tier) throw new Error(`Unknown visit package tier: ${tierKey}`);

  const merchant = await queryOne<{ name: string }>(`select name from merchants where id = $1`, [merchantId]);
  if (!merchant) throw new Error("merchant not found");

  const visitPackage = await createVisitPackage(merchantId, tier.visits);

  const entry = await postJournalEntry({
    reference: `visit-package-${visitPackage.id}`,
    description: `${tier.visits} unique website visits for ${merchant.name}`,
    lines: [
      { accountName: "Cash / Payment Processor Receivable", debit: tier.price },
      { accountName: "Visit Package Revenue", credit: tier.price },
    ],
  });

  return { package: visitPackage, journalEntryNumber: entry.entry_number };
}
