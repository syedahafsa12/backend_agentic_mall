// Builds the wire-format JSON a REST demo-merchant "backend" exposes. This
// intentionally mirrors CatalogItem closely — it stands in for "whatever
// shape this external merchant's own API happens to use" (adapted to Offer[]
// by RestMerchantConnector, not consumed directly by the agent).
import { NextResponse } from "next/server";
import type { CatalogItem } from "./catalog";

const STOPWORDS = new Set(["a", "an", "the", "for", "with", "and", "or", "of", "under", "over", "less", "than", "to", "me", "find", "show", "get", "want", "need"]);

// Generic descriptive filler that shows up in marketing copy across every
// unrelated category — matching on these alone is exactly the "one
// incidental word" false-positive this list exists to prevent (e.g.
// "lightweight" appears in both a bike's AND a pair of linen pants'
// description). Still plain stopword filtering, not semantics: real product
// nouns like "bicycle", "helmet", "cardigan", "dress" are never excluded.
const GENERIC_DESCRIPTORS = new Set([
  "lightweight", "comfortable", "premium", "quality", "classic", "essential", "casual", "relaxed",
  "simple", "soft", "stylish", "modern", "durable", "affordable", "nice", "good", "great", "best",
  "new", "easy", "quick", "fast", "versatile", "everyday", "timeless", "elegant",
]);

// Canonical product type a query word implies. A tiny, explicit, deterministic
// synonym map — not semantic search. "cycle" must resolve to the same
// canonical type as "bike"/"bicycle" so a request for one hard-filters to
// exactly the same products as the others.
export const TYPE_SYNONYMS: Record<string, string> = {
  bicycle: "bicycle", bicycles: "bicycle", bike: "bicycle", bikes: "bicycle", cycle: "bicycle", cycles: "bicycle", cycling: "bicycle",
  hoodie: "hoodie", hoodies: "hoodie",
  shirt: "shirt", shirts: "shirt", tee: "shirt", tees: "shirt", "t-shirt": "shirt", tshirt: "shirt",
  pants: "pants", trousers: "pants",
  shoe: "shoes", shoes: "shoes", footwear: "shoes",
  helmet: "helmet", helmets: "helmet",
  lock: "lock", locks: "lock",
  bag: "bag", bags: "bag", pannier: "bag", panniers: "bag",
  cardigan: "cardigan", cardigans: "cardigan",
  dress: "dress", dresses: "dress",
  cap: "hat", caps: "hat", hat: "hat", hats: "hat",
};

export function wordsOf(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
}

function hasWord(haystackWords: Set<string>, word: string): boolean {
  return haystackWords.has(word);
}

/**
 * Hard-filters by product type first, exactly like a real catalog search
 * would: if the query names a product type (via TYPE_SYNONYMS — "cycle" and
 * "bike" both resolve to "bicycle"), ONLY items whose own structured
 * productTypes include that canonical type are considered at all. A hoodie
 * can never surface for a bicycle query even if its description happens to
 * contain an incidental substring (e.g. "recycled" containing "cycle" — this
 * is exactly why matching is word-boundary, via tokenized sets, never
 * `.includes()` substring matching).
 *
 * Only once no product type is named in the query does this fall back to
 * matching individual meaningful words against title/description/color —
 * still word-boundary, still no synonyms/semantics beyond the type map above.
 */
export function findProducts(catalog: CatalogItem[], query: string | null) {
  if (!query) return catalog;
  const queryWords = wordsOf(query);
  const requestedTypes = new Set(queryWords.map((w) => TYPE_SYNONYMS[w]).filter((t): t is string => !!t));

  if (requestedTypes.size > 0) {
    return catalog.filter((item) => {
      if (!item.productTypes) return false;
      const itemTypes = new Set(item.productTypes.map((t) => TYPE_SYNONYMS[t.toLowerCase()] ?? t.toLowerCase()));
      return [...requestedTypes].some((t) => itemTypes.has(t));
    });
  }

  const words = queryWords.filter((w) => w.length > 2 && !STOPWORDS.has(w) && !GENERIC_DESCRIPTORS.has(w) && !/^\d+$/.test(w));
  if (words.length === 0) return catalog;
  return catalog.filter((item) => {
    const haystackWords = new Set(wordsOf(`${item.title} ${item.description} ${item.color ?? ""}`));
    return words.some((w) => hasWord(haystackWords, w));
  });
}

export function productWire(item: CatalogItem) {
  return {
    id: item.productId,
    title: item.title,
    description: item.description,
    category: item.category,
    price: item.price,
    currency: item.currency,
    color: item.color ?? null,
    image: item.image,
    quantity: item.quantity,
    shipping: item.shipping,
    returns: item.returns,
    warranty: item.warranty,
    retrievedAt: item.retrievedAtOverride ?? new Date().toISOString(),
  };
}

export function notFound(id: string) {
  return NextResponse.json({ error: `product ${id} not found` }, { status: 404 });
}

export function findById(catalog: CatalogItem[], id: string) {
  return catalog.find((p) => p.productId === id);
}

export function subResource(catalog: CatalogItem[], id: string, key: "inventory" | "shipping" | "returns" | "warranty") {
  const item = findById(catalog, id);
  if (!item) return notFound(id);
  const retrievedAt = item.retrievedAtOverride ?? new Date().toISOString();
  if (key === "inventory") {
    return NextResponse.json({ inStock: (item.quantity ?? 1) > 0, quantity: item.quantity, retrievedAt });
  }
  if (key === "shipping") return NextResponse.json(item.shipping);
  if (key === "returns") return NextResponse.json(item.returns);
  return NextResponse.json(item.warranty);
}
