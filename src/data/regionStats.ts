import { INITIAL_FORECASTS, INITIAL_RETAILERS } from "./mockData";
import type { RetailerType } from "../types";
import type { RegionStat } from "@/components/map-section/types";

/** Approximate store locations (WGS84). */
const RETAILER_COORDS: Record<string, { lat: number; lng: number }> = {
  "RET-GAN": { lat: 16.6958, lng: 74.2262 }, // Kolhapur, Mangalwar Peth
  "RET-LAX": { lat: 17.289, lng: 74.1817 }, // Karad
  "RET-BAL": { lat: 16.8524, lng: 74.5815 }, // Sangli
  "RET-MAH": { lat: 17.6599, lng: 75.9064 }, // Solapur
  "RET-OMS": { lat: 17.6805, lng: 74.0183 }, // Satara
  "RET-SAM": { lat: 18.5115, lng: 73.8553 }, // Pune, Sadashiv Peth
  "RET-REL": { lat: 16.7086, lng: 74.2382 }, // Kolhapur, Shahupuri
  "RET-DMA": { lat: 18.5074, lng: 73.8077 }, // Pune, Kothrud
};

const CATEGORY_LABELS: Record<RetailerType, string> = {
  kirana: "Store Management",
  store_management: "Store Management",
  modern_trade: "Modern Trade",
  distributor: "Distributor",
};

function isRegionStat(x: unknown): x is RegionStat {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.name === "string" &&
    typeof r.lat === "number" &&
    typeof r.lng === "number" &&
    typeof r.value === "number" &&
    typeof r.category === "string"
  );
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/**
 * Loads per-retailer stats. Uses `VITE_REGION_STATS_URL` when set (expects a
 * JSON array of RegionStat); otherwise builds the data from the local mock
 * store: value = sum of median (P50) weekly demand forecasts, in units.
 * Add `?mapError` to the page URL to preview the error state.
 */
export async function fetchRegionStats(signal?: AbortSignal): Promise<RegionStat[]> {
  const url: string | undefined = import.meta.env.VITE_REGION_STATS_URL;
  if (url) {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    const json: unknown = await res.json();
    if (!Array.isArray(json)) throw new Error("Unexpected response format");
    return json.filter(isRegionStat).map((r) => ({ ...r, city: r.city ?? "" }));
  }

  await wait(450, signal);
  if (new URLSearchParams(window.location.search).has("mapError")) {
    throw new Error("Could not reach the stats service (simulated).");
  }

  return INITIAL_RETAILERS.flatMap((r) => {
    const coords = RETAILER_COORDS[r.id];
    if (!coords) return [];
    const value = INITIAL_FORECASTS.filter((f) => f.retailerId === r.id).reduce(
      (sum, f) => sum + f.q50,
      0,
    );
    return [
      {
        id: r.id,
        name: r.name,
        city: r.city,
        lat: coords.lat,
        lng: coords.lng,
        value,
        category: CATEGORY_LABELS[r.type],
      },
    ];
  });
}
