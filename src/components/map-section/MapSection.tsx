import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RotateCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchRegionStats } from "@/data/regionStats";

import { DataMap } from "./DataMap";
import { RankedBarTable, RankedBarTableSkeleton } from "./RankedBarTable";
import {
  ALL_CATEGORIES,
  type FlyRequest,
  type LoadState,
  type RankedRegionStat,
  type RegionStat,
  type SortKey,
  type SortState,
} from "./types";

const VALUE_LABEL = "Forecast weekly demand (units, P50)";
const CATEGORY_LABEL = "Channel";

const CATEGORY_COLORS: Record<string, string> = {
  "Modern Trade": "#2563EB", // blue accent
  Distributor: "#15803D", // green success
  Kirana: "#8B5E3C", // brown accent
};
const FALLBACK_COLORS = ["#2563EB", "#8B5E3C", "#D97706", "#15803D", "#DC2626"];

const numberFormat = new Intl.NumberFormat("en-IN");
const formatValue = (n: number) => numberFormat.format(n);

/** Hover + selection shared by the table and the map. */
function useLinkedSelection() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyRequest, setFlyRequest] = useState<FlyRequest | null>(null);

  /** From a table row: select and fly the map there. */
  const selectFromTable = useCallback((id: string) => {
    setSelectedId(id);
    setFlyRequest((prev) => ({ id, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  /** From a marker click: the map is already looking at it. */
  const selectFromMap = useCallback((id: string) => setSelectedId(id), []);

  /** A popup closed; clear only if it belonged to the current selection. */
  const clearIfSelected = useCallback(
    (id: string) => setSelectedId((prev) => (prev === id ? null : prev)),
    [],
  );

  return {
    hoveredId,
    selectedId,
    flyRequest,
    setHoveredId,
    selectFromTable,
    selectFromMap,
    clearIfSelected,
  };
}

function useRegionStats() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchRegionStats(controller.signal)
      .then((data) => setState({ status: "success", data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Something went wrong.",
        });
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);
  return { state, retry };
}

function rankAndColor(data: RegionStat[]): RankedRegionStat[] {
  const extraColors = new globalThis.Map<string, string>();
  const colorFor = (category: string) => {
    const known = CATEGORY_COLORS[category];
    if (known) return known;
    if (!extraColors.has(category)) {
      extraColors.set(category, FALLBACK_COLORS[extraColors.size % FALLBACK_COLORS.length]);
    }
    return extraColors.get(category) ?? FALLBACK_COLORS[0];
  };
  return [...data]
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .map((r, i) => ({ ...r, rank: i + 1, color: colorFor(r.category) }));
}

const EMPTY: RegionStat[] = [];

export function MapSection() {
  const { state, retry } = useRegionStats();
  const link = useLinkedSelection();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [sort, setSort] = useState<SortState>({ key: "value", dir: "desc" });

  const data = state.status === "success" ? state.data : EMPTY;

  const ranked = useMemo(() => rankAndColor(data), [data]);

  const categories = useMemo(
    () => [...new Set(ranked.map((r) => r.category))].sort((a, b) => a.localeCompare(b)),
    [ranked],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = ranked.filter(
      (r) =>
        (category === ALL_CATEGORIES || r.category === category) &&
        (q === "" || r.name.toLowerCase().includes(q)),
    );
    const dir = sort.dir === "asc" ? 1 : -1;
    return filtered.sort((a, b) =>
      sort.key === "name"
        ? dir * a.name.localeCompare(b.name)
        : dir * (a.value - b.value) || a.name.localeCompare(b.name),
    );
  }, [ranked, query, category, sort]);

  const { maxValue, totalValue } = useMemo(
    () => ({
      maxValue: visible.reduce((m, r) => Math.max(m, r.value), 0),
      totalValue: visible.reduce((s, r) => s + r.value, 0),
    }),
    [visible],
  );

  // Ignore hover/selection for rows hidden by the current filter.
  const visibleIds = useMemo(() => new Set(visible.map((r) => r.id)), [visible]);
  const hoveredId = link.hoveredId && visibleIds.has(link.hoveredId) ? link.hoveredId : null;
  const selectedId = link.selectedId && visibleIds.has(link.selectedId) ? link.selectedId : null;

  const handleSortChange = useCallback((key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" },
    );
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setCategory(ALL_CATEGORIES);
  }, []);

  return (
    <Card className="bg-white border-[#E7E5E4] shadow-xs text-[#292524]">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-[#292524]">
                Distribution Network & Retailer Demand Map
              </CardTitle>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-[#15803D] border border-emerald-200">
                🛰️ Satellite View
              </span>
            </div>
            <CardDescription className="text-xs text-[#78716C] mt-0.5">
              {VALUE_LABEL} across Maharashtra warehouses, supply corridors, and retail kiranas. Switch between Satellite, Hybrid, and Map modes.
            </CardDescription>
          </div>
        </div>
        <ul className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-xs">
          <li className="flex items-center gap-1.5 font-medium text-[#292524]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#8B5E3C] border border-white" aria-hidden />
            <span>Warehouse Hubs (3)</span>
          </li>
          <li className="flex items-center gap-1.5 font-medium text-[#292524]">
            <span className="w-4 h-0.5 bg-[#38BDF8] rounded" aria-hidden />
            <span>Supply Corridors</span>
          </li>
          {categories.map((c) => (
            <li key={c} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: ranked.find((r) => r.category === c)?.color }}
                aria-hidden
              />
              {c}
            </li>
          ))}
        </ul>
      </CardHeader>

      <CardContent>
        {state.status === "error" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle />
            <AlertTitle>Couldn't load map data</AlertTitle>
            <AlertDescription>
              <p>{state.message}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={retry}>
                <RotateCw /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid min-w-0 gap-4 lg:h-[520px] lg:grid-cols-5">
          <div className="min-w-0 lg:col-span-2 lg:min-h-0">
            {state.status === "loading" ? (
              <RankedBarTableSkeleton />
            ) : (
              <RankedBarTable
                rows={visible}
                totalCount={ranked.length}
                maxValue={maxValue}
                totalValue={totalValue}
                formatValue={formatValue}
                valueLabel={VALUE_LABEL}
                categoryLabel={CATEGORY_LABEL}
                categories={categories}
                query={query}
                onQueryChange={setQuery}
                category={category}
                onCategoryChange={setCategory}
                onClearFilters={clearFilters}
                sort={sort}
                onSortChange={handleSortChange}
                hoveredId={hoveredId}
                selectedId={selectedId}
                onHover={link.setHoveredId}
                onSelect={link.selectFromTable}
              />
            )}
          </div>

          {/* Map first on mobile, right column on desktop. */}
          <div className="order-first h-[320px] min-w-0 lg:order-none lg:col-span-3 lg:h-full">
            {state.status === "loading" ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : (
              <DataMap
                rows={visible}
                totalCount={ranked.length}
                maxValue={maxValue}
                formatValue={formatValue}
                valueLabel={VALUE_LABEL}
                hoveredId={hoveredId}
                selectedId={selectedId}
                flyRequest={link.flyRequest}
                onHover={link.setHoveredId}
                onSelect={link.selectFromMap}
                onPopupClosed={link.clearIfSelected}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MapSection;
