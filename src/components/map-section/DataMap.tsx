import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Layers, Route as RouteIcon, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerPopup,
  useMap,
  useMarkerContext,
  type MapRef,
  type MapTypeId,
} from "@/components/ui/map";
import { INITIAL_ROUTES, INITIAL_WAREHOUSES } from "@/data/mockData";

import type { FlyRequest, RankedRegionStat } from "./types";

interface DataMapProps {
  rows: RankedRegionStat[];
  totalCount: number;
  maxValue: number;
  formatValue: (n: number) => string;
  valueLabel: string;
  hoveredId: string | null;
  selectedId: string | null;
  flyRequest: FlyRequest | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onPopupClosed: (id: string) => void;
  defaultMapTypeId?: MapTypeId;
}

const MIN_SIZE = 10;
const MAX_SIZE = 32;
const FOCUS_ZOOM = 11;
// Western Maharashtra, roughly centred on the store network.
const INITIAL_CENTER: [number, number] = [74.7, 17.5];

/** Approximate warehouse coordinates (WGS84). */
export const WAREHOUSE_COORDS: Record<string, { lat: number; lng: number }> = {
  "WH-PUN": { lat: 18.5204, lng: 73.8567 }, // Pune Central Logistics Hub
  "WH-SAT": { lat: 17.6805, lng: 74.0183 }, // Satara Regional Depot
  "WH-KOL": { lat: 16.705, lng: 74.2433 },  // Kolhapur Distribution Center
};

export const WAREHOUSE_NODES = INITIAL_WAREHOUSES.map((w) => ({
  ...w,
  lat: WAREHOUSE_COORDS[w.id]?.lat ?? 18.5,
  lng: WAREHOUSE_COORDS[w.id]?.lng ?? 73.8,
}));

/** sqrt scale so marker *area* is proportional to value. */
function markerSize(value: number, maxValue: number): number {
  if (maxValue <= 0) return MIN_SIZE;
  const t = Math.sqrt(Math.max(0, value) / maxValue);
  return MIN_SIZE + (MAX_SIZE - MIN_SIZE) * t;
}

export function DataMap({
  rows,
  totalCount,
  maxValue,
  formatValue,
  valueLabel,
  hoveredId,
  selectedId,
  flyRequest,
  onHover,
  onSelect,
  onPopupClosed,
  defaultMapTypeId = "satellite",
}: DataMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapTypeId, setMapTypeId] = useState<MapTypeId>(defaultMapTypeId);
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);

  // Row click → fly to that marker.
  useEffect(() => {
    if (!flyRequest) return;
    const row = rows.find((r) => r.id === flyRequest.id);
    const map = mapRef.current;
    if (!row || !map) return;
    map.flyTo({
      center: [row.lng, row.lat],
      zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
      duration: 900,
      essential: true,
    });
    // Only react to new requests, not to row changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyRequest]);

  // Build route lines from warehouses to retailers
  const routeFeatures = useMemo(() => {
    const rowMap = new globalThis.Map<string, RankedRegionStat>(rows.map((r) => [r.id, r]));
    const whMap = new globalThis.Map(WAREHOUSE_NODES.map((w) => [w.id, w]));

    return INITIAL_ROUTES.map((route, idx) => {
      const wh = whMap.get(route.warehouseId);
      const ret = rowMap.get(route.retailerId);
      if (!wh || !ret) return null;

      const isConnectedToActiveRetailer =
        ret.id === selectedId || ret.id === hoveredId;
      const isConnectedToActiveWarehouse =
        wh.id === selectedWarehouseId;
      const isActive = isConnectedToActiveRetailer || isConnectedToActiveWarehouse;

      return {
        id: `route-${route.warehouseId}-${route.retailerId}-${idx}`,
        warehouseName: wh.name,
        retailerName: ret.name,
        costPerCaseRupees: route.costPerCaseRupees,
        transitDays: route.transitDays,
        coordinates: [
          [wh.lng, wh.lat] as [number, number],
          [ret.lng, ret.lat] as [number, number],
        ],
        isActive,
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);
  }, [rows, selectedId, hoveredId, selectedWarehouseId]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-[#E7E5E4] shadow-xs">
      {/* Google Maps Layer Switcher & Route Toggle Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 p-1 bg-white/95 backdrop-blur-md border border-[#E7E5E4] rounded-xl shadow-md text-xs font-semibold">
        <div className="flex items-center gap-0.5 px-1 text-[11px] font-bold text-[#64748B] border-r border-[#E7E5E4] pr-2 mr-0.5">
          <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Layer:</span>
        </div>

        {/* Satellite Mode (Default) */}
        <button
          type="button"
          onClick={() => setMapTypeId("satellite")}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
            mapTypeId === "satellite"
              ? "bg-[#DC2626] text-white shadow-xs"
              : "text-[#1E293B] hover:bg-[#FFF8E7]"
          )}
          title="Google Maps Satellite Mode (Default)"
        >
          <span>🛰️ Satellite</span>
        </button>

        {/* Hybrid Mode (Satellite + Labels) */}
        <button
          type="button"
          onClick={() => setMapTypeId("hybrid")}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
            mapTypeId === "hybrid"
              ? "bg-[#DC2626] text-white shadow-xs"
              : "text-[#1E293B] hover:bg-[#FFF8E7]"
          )}
          title="Google Maps Hybrid Mode (Satellite + Roads & Labels)"
        >
          <span>🌐 Hybrid</span>
        </button>

        {/* Standard Road Map */}
        <button
          type="button"
          onClick={() => setMapTypeId("roadmap")}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
            mapTypeId === "roadmap" || mapTypeId === "map"
              ? "bg-[#DC2626] text-white shadow-xs"
              : "text-[#1E293B] hover:bg-[#FFF8E7]"
          )}
          title="Standard Street Map"
        >
          <span>🗺️ Map</span>
        </button>

        <div className="h-4 w-px bg-[#E7E5E4] mx-1" />

        {/* Routes Toggle */}
        <button
          type="button"
          onClick={() => setShowRoutes(!showRoutes)}
          className={cn(
            "px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer",
            showRoutes
              ? "bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]"
              : "text-[#64748B] hover:bg-[#FFF8E7]"
          )}
          title="Toggle Distribution Corridor Routes"
        >
          <RouteIcon className="w-3.5 h-3.5" />
          <span>Routes ({routeFeatures.length})</span>
        </button>
      </div>

      {/* Main Map Component with Google Maps Satellite Mode */}
      <Map
        ref={mapRef}
        center={INITIAL_CENTER}
        zoom={6.4}
        mapTypeId={mapTypeId}
        attributionControl={{ compact: true }}
      >
        <MapControls position="bottom-right" showZoom showLocate />
        <FitToRows rows={rows} />

        {/* 1. Distribution Route Corridors (Warehouses -> Retailers) */}
        {showRoutes &&
          routeFeatures.map((route) => (
            <MapRoute
              key={route.id}
              id={route.id}
              coordinates={route.coordinates}
              color={
                route.isActive
                  ? "#DC2626"
                  : mapTypeId === "roadmap"
                  ? "#2563EB"
                  : "#38BDF8"
              }
              width={route.isActive ? 4 : 2}
              opacity={route.isActive ? 0.95 : 0.6}
              dashArray={route.isActive ? undefined : [4, 3]}
            />
          ))}

        {/* 2. Warehouse Locations (Primary Supply Hubs) */}
        {WAREHOUSE_NODES.map((wh) => {
          const isSelected = selectedWarehouseId === wh.id;
          return (
            <MapMarker
              key={wh.id}
              longitude={wh.lng}
              latitude={wh.lat}
              onClick={() =>
                setSelectedWarehouseId((prev) => (prev === wh.id ? null : wh.id))
              }
            >
              <MarkerContent>
                <div
                  role="img"
                  aria-label={`${wh.name}: Warehouse Hub`}
                  className={cn(
                    "flex items-center justify-center rounded-lg border-2 border-white shadow-xl bg-[#2563EB] text-white p-1 transition-transform duration-150 ease-out cursor-pointer hover:scale-125",
                    isSelected && "ring-4 ring-[#DC2626] scale-125 shadow-2xl"
                  )}
                  style={{ width: 28, height: 28 }}
                  title={`${wh.name} (${wh.city})`}
                >
                  <Building2 className="w-4 h-4 text-white" />
                </div>
              </MarkerContent>
              <MarkerPopup closeButton offset={18}>
                <div className="space-y-1.5 pr-3 text-[#1E293B]">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 rounded bg-[#2563EB] text-white">
                      <Building2 className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <p className="leading-snug font-bold text-sm text-[#1E293B]">
                        {wh.name}
                      </p>
                      <p className="text-[10px] text-[#64748B] uppercase font-semibold">
                        Primary Warehouse • {wh.city}
                      </p>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-[#E7E5E4] space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748B]">Cycle Capacity:</span>
                      <span className="font-mono font-bold text-[#1E293B]">
                        {wh.capacityCasesPerCycle.toLocaleString()} cases
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748B]">Current Utilization:</span>
                      <span className="font-mono font-bold text-[#15803D]">
                        {(wh.utilizationCases ?? 0).toLocaleString()} cases (
                        {Math.round(((wh.utilizationCases ?? 0) / wh.capacityCasesPerCycle) * 100)}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748B]">Depot Manager:</span>
                      <span className="font-medium text-[#1E293B]">{wh.managerName}</span>
                    </div>
                  </div>
                </div>
              </MarkerPopup>
            </MapMarker>
          );
        })}

        {/* 3. Retailer Locations (Kirana, Modern Trade, Distributors) */}
        {rows.map((row) => {
          const size = markerSize(row.value, maxValue);
          const isActive = row.id === hoveredId || row.id === selectedId;
          return (
            <MapMarker
              key={row.id}
              longitude={row.lng}
              latitude={row.lat}
              onMouseEnter={() => onHover(row.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(row.id)}
            >
              <MarkerContent>
                <div
                  role="img"
                  aria-label={`${row.name}: ${formatValue(row.value)}`}
                  className={cn(
                    "rounded-full border-2 border-white/95 shadow-md transition-transform duration-150 ease-out cursor-pointer",
                    isActive && "ring-[#DC2626] scale-125 ring-4 shadow-xl"
                  )}
                  style={{ width: size, height: size, backgroundColor: row.color }}
                />
              </MarkerContent>
              <MarkerPopup closeButton offset={size / 2 + 8}>
                <div className="space-y-1.5 pr-4 text-[#1E293B]">
                  <p className="leading-snug font-bold text-sm text-[#1E293B]">{row.name}</p>
                  <p className="text-[#64748B] flex items-center gap-1.5 text-xs">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: row.color }}
                      aria-hidden
                    />
                    <span className="font-semibold">{row.category}</span> · {row.city}
                  </p>
                  <div className="flex items-baseline justify-between gap-4 pt-1 border-t border-[#E7E5E4]">
                    <span className="text-base font-extrabold text-[#1E293B] tabular-nums font-mono">
                      {formatValue(row.value)}
                    </span>
                    <span className="text-[#2563EB] text-xs font-bold tabular-nums">
                      Rank #{row.rank} of {totalCount}
                    </span>
                  </div>
                  <p className="text-[#64748B] text-[11px]">{valueLabel}</p>
                </div>
              </MarkerPopup>
              <MarkerSync
                id={row.id}
                isActive={isActive}
                isSelected={row.id === selectedId}
                onPopupClosed={onPopupClosed}
              />
            </MapMarker>
          );
        })}
      </Map>
    </div>
  );
}

interface MarkerSyncProps {
  id: string;
  isActive: boolean;
  isSelected: boolean;
  onPopupClosed: (id: string) => void;
}

/**
 * Keeps a marker's popup and stacking order in step with the shared selection
 * state. Must render after <MarkerPopup> so the popup is attached first.
 */
function MarkerSync({ id, isActive, isSelected, onPopupClosed }: MarkerSyncProps) {
  const { marker } = useMarkerContext();
  const onClosedRef = useRef(onPopupClosed);
  useEffect(() => {
    onClosedRef.current = onPopupClosed;
  }, [onPopupClosed]);

  // Bring hovered/selected markers above their neighbours.
  useEffect(() => {
    marker.getElement().style.zIndex = isActive ? "10" : "";
  }, [marker, isActive]);

  // Open/close the popup when selection changes from outside the map.
  useEffect(() => {
    const popup = marker.getPopup();
    if (!popup) return;
    if (isSelected && !popup.isOpen()) marker.togglePopup();
    else if (!isSelected && popup.isOpen()) popup.remove();
  }, [marker, isSelected]);

  // Popup closed by the user (close button / map click) → clear selection.
  useEffect(() => {
    const popup = marker.getPopup();
    if (!popup) return;
    const handleClose = () => onClosedRef.current(id);
    popup.on("close", handleClose);
    return () => {
      popup.off("close", handleClose);
    };
  }, [marker, id]);

  return null;
}

/** Fits the camera to the visible markers and warehouses on initial load. */
function FitToRows({ rows }: { rows: RankedRegionStat[] }) {
  const { map, isLoaded } = useMap();
  const hasFitRef = useRef(false);
  const key = rows.map((r) => r.id).join("|");

  useEffect(() => {
    if (!map || !isLoaded || rows.length === 0) return;
    const duration = hasFitRef.current ? 700 : 0;
    hasFitRef.current = true;

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    // Include retailers
    for (const r of rows) {
      minLng = Math.min(minLng, r.lng);
      minLat = Math.min(minLat, r.lat);
      maxLng = Math.max(maxLng, r.lng);
      maxLat = Math.max(maxLat, r.lat);
    }

    // Include warehouse locations
    for (const w of WAREHOUSE_NODES) {
      minLng = Math.min(minLng, w.lng);
      minLat = Math.min(minLat, w.lat);
      maxLng = Math.max(maxLng, w.lng);
      maxLat = Math.max(maxLat, w.lat);
    }

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 48, maxZoom: FOCUS_ZOOM, duration }
    );
    // `key` captures the visible set; `rows` identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, key]);

  return null;
}
