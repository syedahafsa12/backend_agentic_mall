// Mock tax engine — stands in for Zamp (see docs/TRADE_SECRET notes). Rates
// are real published combined sales-tax rates for each jurisdiction, looked
// up and computed per call; nothing here is a hardcoded final total. Swap
// `calculateTax` for a real Zamp API call later without touching callers —
// the signature (destination + taxable amount -> jurisdiction/rate/amount)
// is exactly what a real tax provider API takes and returns.
export interface TaxDestination {
  country: string;
  region: string; // state/province
  city: string;
  postalCode: string;
}

export interface TaxResult {
  jurisdiction: string;
  taxRate: number; // decimal, e.g. 0.08875
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

interface JurisdictionRate {
  label: string;
  rate: number;
}

// A handful of real, published combined (state + local) sales-tax rates —
// enough to demonstrate the engine actually varies by destination.
const CITY_RATES: Record<string, JurisdictionRate> = {
  "US|NY|NEW YORK": { label: "New York City, NY", rate: 0.08875 },
  "US|CA|LOS ANGELES": { label: "Los Angeles, CA", rate: 0.095 },
  "US|CA|SAN FRANCISCO": { label: "San Francisco, CA", rate: 0.08625 },
  "US|TX|AUSTIN": { label: "Austin, TX", rate: 0.0825 },
  "US|WA|SEATTLE": { label: "Seattle, WA", rate: 0.1025 },
};
const STATE_RATES: Record<string, JurisdictionRate> = {
  "US|NY": { label: "New York State", rate: 0.04 },
  "US|CA": { label: "California", rate: 0.0725 },
  "US|TX": { label: "Texas", rate: 0.0625 },
  "US|WA": { label: "Washington", rate: 0.065 },
  "US|OR": { label: "Oregon", rate: 0 }, // no state sales tax
  "US|MT": { label: "Montana", rate: 0 },
  "US|DE": { label: "Delaware", rate: 0 },
};
const DEFAULT_RATE: JurisdictionRate = { label: "Default (unmapped jurisdiction)", rate: 0.07 };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateTax(destination: TaxDestination, taxableAmount: number): TaxResult {
  const country = destination.country.trim().toUpperCase();
  const region = destination.region.trim().toUpperCase();
  const city = destination.city.trim().toUpperCase();

  const cityKey = `${country}|${region}|${city}`;
  const stateKey = `${country}|${region}`;
  const match = CITY_RATES[cityKey] ?? STATE_RATES[stateKey] ?? DEFAULT_RATE;

  const taxAmount = round2(taxableAmount * match.rate);
  return {
    jurisdiction: match.label,
    taxRate: match.rate,
    taxableAmount: round2(taxableAmount),
    taxAmount,
    total: round2(taxableAmount + taxAmount),
  };
}
