"use client";

import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { listGlobalOutlets, type OutletOverviewItem } from "@/app/lib/api";
import {
  INDONESIA_PROVINCE_GEOJSON,
  matchProvinceToGadmName,
  type IndonesiaProvinceFeature,
} from "@/app/lib/geo/indonesia-provinces";

const ANALYTICS_SAMPLE_LIMIT = 100;

/**
 * Analitik Outlet — dua diagram:
 * 1. Tren pertumbuhan outlet per bulan (dari `created_at`).
 * 2. Peta Indonesia (choropleth SVG custom via `d3-geo`) — sebaran jumlah
 *    outlet per provinsi.
 *
 * KETERBATASAN (dicatat, bukan disembunyikan): backend tidak punya endpoint
 * agregat khusus analitik. Kedua diagram dihitung CLIENT-SIDE dari sample
 * maksimum 100 outlet (limit tertinggi yang diterima backend) — dari total
 * 107 outlet saat ditulis, cakupannya ~93%, bukan 100%. Provinsi yang tidak
 * bisa dicocokkan ke data GADM (ejaan tidak baku atau salah isi nama
 * kabupaten) dihitung terpisah sebagai "Tidak teridentifikasi", tidak
 * dipaksakan masuk salah satu provinsi.
 */
export default function OutletAnalytics() {
  const [outlets, setOutlets] = useState<OutletOverviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [sampleTotal, setSampleTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await listGlobalOutlets({ limit: ANALYTICS_SAMPLE_LIMIT });
        if (cancelled) return;
        setOutlets(res.items);
        setSampleTotal(res.pagination.total);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat data analitik.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthlyTrend = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const outlet of outlets) {
      const date = new Date(outlet.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  }, [outlets]);

  const { countByProvince, unmatchedCount } = useMemo(() => {
    const counts = new Map<string, number>();
    let unmatched = 0;
    for (const outlet of outlets) {
      const gadmName = matchProvinceToGadmName(outlet.province);
      if (!gadmName) {
        unmatched += 1;
        continue;
      }
      counts.set(gadmName, (counts.get(gadmName) || 0) + 1);
    }
    return { countByProvince: counts, unmatchedCount: unmatched };
  }, [outlets]);

  const maxCount = Math.max(1, ...Array.from(countByProvince.values()));

  const projection = useMemo(
    () =>
      geoMercator().fitSize(
        [760, 340],
        INDONESIA_PROVINCE_GEOJSON as unknown as Parameters<
          ReturnType<typeof geoMercator>["fitSize"]
        >[1],
      ),
    [],
  );
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  if (isLoading) {
    return <p className="p-8 text-center text-xs font-bold text-gray-400">Memuat analitik...</p>;
  }
  if (error) {
    return <p className="p-8 text-center text-xs font-bold text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-800">
        Dihitung dari sample {outlets.length} dari {sampleTotal} total outlet (backend belum punya
        endpoint agregat analitik khusus) — bukan agregat 100% lengkap.
      </p>

      <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-xs">
        <h3 className="mb-3 text-sm font-black text-gray-900">Tren Pertumbuhan Outlet</h3>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Outlet Baru" fill="#C92C1E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-xs">
        <h3 className="mb-1 text-sm font-black text-gray-900">Peta Persebaran Outlet per Provinsi</h3>
        {unmatchedCount > 0 && (
          <p className="mb-2 text-[10px] text-gray-400">
            {unmatchedCount} outlet tidak teridentifikasi provinsinya (data provinsi tidak baku) — tidak
            dihitung di peta.
          </p>
        )}
        <div className="relative">
          <svg viewBox="0 0 760 340" className="w-full">
            {INDONESIA_PROVINCE_GEOJSON.features.map((feature: IndonesiaProvinceFeature) => {
              const name = feature.properties.NAME_1;
              const count = countByProvince.get(name) || 0;
              const intensity = count === 0 ? 0 : 0.25 + (count / maxCount) * 0.75;
              const path = pathGenerator(feature as never) || "";
              return (
                <path
                  key={name}
                  d={path}
                  fill={count === 0 ? "#F3F4F6" : `rgba(201, 44, 30, ${intensity})`}
                  stroke="#fff"
                  strokeWidth={0.5}
                  onMouseEnter={() => setHoveredProvince(name)}
                  onMouseLeave={() => setHoveredProvince((prev) => (prev === name ? null : prev))}
                />
              );
            })}
          </svg>
          {hoveredProvince && (
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-gray-900/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
              {hoveredProvince}: {countByProvince.get(hoveredProvince) || 0} outlet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
