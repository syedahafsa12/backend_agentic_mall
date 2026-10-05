// TrailWorks — the third demo merchant (the slot left open by seed-agent-mall.ts
// after Northstar/Vertex/Urban were retired). Cadence Cycles and Luna Apparel
// port real external catalogs; no real "TrailWorks" site exists to port from,
// so this is original demo data, built with the exact same CatalogItem shape
// and served through the same REST adapter pattern (rest-handlers.ts) as
// every other demo merchant — nothing new in the connector layer.
import type { CatalogItem } from "./catalog";

export const TRAILWORKS_SLUG = "trailworks";

interface TrailworksProduct {
  id: string;
  name: string;
  category: "footwear" | "pack" | "shelter" | "gear" | "apparel";
  color: string;
  price: number;
  stock: number;
  description: string;
}

const TRAILWORKS_PRODUCTS: TrailworksProduct[] = [
  { id: "boot-101", name: "Ridgeline Waterproof Hiking Boot", category: "footwear", color: "brown", price: 169, stock: 18, description: "Full-grain leather hiking boot with a waterproof membrane and Vibram outsole." },
  { id: "boot-102", name: "Switchback Trail Runner", category: "footwear", color: "grey", price: 129, stock: 0, description: "Lightweight breathable trail running shoe with aggressive lug pattern." },
  { id: "pack-201", name: "Summit 45L Backpacking Pack", category: "pack", color: "green", price: 219, stock: 7, description: "45-litre backpacking pack with adjustable torso length and rain cover." },
  { id: "pack-202", name: "Daywalker 22L Hiking Pack", category: "pack", color: "blue", price: 89, stock: 23, description: "22-litre day pack with hydration-bladder sleeve and hip belt." },
  { id: "tent-301", name: "Alpine 2-Person Tent", category: "shelter", color: "orange", price: 299, stock: 5, description: "Freestanding 3-season tent, 2.1kg packed, two vestibules." },
  { id: "gear-401", name: "Carbon Trekking Poles (Pair)", category: "gear", color: "black", price: 89, stock: 31, description: "Collapsible carbon-fibre trekking poles with cork grips." },
  { id: "gear-402", name: "Compact Water Filter", category: "gear", color: "grey", price: 45, stock: 40, description: "Hollow-fibre filter straw, removes 99.9% of waterborne bacteria and protozoa." },
  { id: "wear-501", name: "Merino Wool Hiking Socks (2-Pack)", category: "apparel", color: "grey", price: 24, stock: 50, description: "Cushioned merino wool blend hiking socks, moisture-wicking." },
  { id: "wear-502", name: "Storm Shell Rain Jacket", category: "apparel", color: "yellow", price: 149, stock: 12, description: "Fully seam-sealed waterproof shell with pit zips and packable hood." },
];

function toTrailworksCatalogItem(p: TrailworksProduct): CatalogItem {
  const isFree = p.price >= 100;
  const isShelterOrPack = p.category === "shelter" || p.category === "pack";
  return {
    productId: p.id,
    title: p.name,
    description: p.description,
    category: "product",
    price: p.price,
    currency: "USD",
    color: p.color,
    quantity: p.stock,
    shipping: {
      isFree,
      cost: isFree ? null : 8,
      estimatedDays: isShelterOrPack ? 4 : 2,
      available: true,
    },
    returns: {
      windowDays: 60,
      isFreeReturns: true,
      notes: "60-day returns on unused gear in original packaging — trail-tested once, still returnable.",
    },
    warranty:
      p.category === "footwear"
        ? { months: 12, notes: "12-month warranty against manufacturing defects." }
        : isShelterOrPack
          ? { months: 24, notes: "2-year warranty on poles, zips and seams." }
          : { months: null, notes: "Not covered by a manufacturer warranty." },
  };
}

export const TRAILWORKS_CATALOG: CatalogItem[] = TRAILWORKS_PRODUCTS.map(toTrailworksCatalogItem);
