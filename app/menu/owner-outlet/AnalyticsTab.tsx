"use client";

import React, { useEffect, useState, useMemo } from "react";
import { fetchOwners, type BackendOwner } from "@/app/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export default function AnalyticsTab() {
  const [data, setData] = useState<BackendOwner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await fetchOwners({ limit: 5000 });
        setData(res.data.items);
      } catch (err) {
        console.error("Gagal memuat data analitik:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const growthData = useMemo(() => {
    if (!data.length) return [];
    
    // Group by month
    const counts: Record<string, number> = {};
    data.forEach(owner => {
      if (!owner.created_at) return;
      const date = new Date(owner.created_at);
      const monthYear = date.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
      counts[monthYear] = (counts[monthYear] || 0) + 1;
    });

    // Create sorted array
    const rawData = Object.entries(counts).map(([name, Total]) => {
      const parts = name.split(' ');
      if (parts.length !== 2) return { name, Total, _sortKey: 0 };
      const [mStr, yStr] = parts;
      const monthIdx = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'].indexOf(mStr);
      return { name, Total, _sortKey: parseInt(yStr) * 12 + monthIdx };
    });
    
    return rawData.sort((a, b) => a._sortKey - b._sortKey).map(({ name, Total }) => ({ name, Total }));
  }, [data]);

  const statusData = useMemo(() => {
    const active = data.filter(d => d.status === "ACTIVE").length;
    const inactive = data.length - active;
    return [
      { name: "Aktif", value: active },
      { name: "Non-Aktif", value: inactive },
    ];
  }, [data]);

  const cityData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(owner => {
      const city = owner.city || "Tidak Diketahui";
      counts[city] = (counts[city] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, Total]) => ({ name, Total }))
      .sort((a, b) => b.Total - a.Total)
      .slice(0, 5); // Top 5
  }, [data]);

  const COLORS = ["#059669", "#DC2626"]; // Emerald for active, Red for inactive

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 bg-white rounded-2xl border border-gray-200/60 shadow-sm">
        <svg className="animate-spin h-8 w-8 text-[#C92C1E] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-500 font-medium">Mempersiapkan data analitik...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Growth Trend */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/60 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Tren Pertumbuhan Owner</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dx={-10} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#111827' }}
                itemStyle={{ color: '#111827', fontWeight: 500 }}
                labelStyle={{ color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}
              />
              <Line 
                type="monotone" 
                dataKey="Total" 
                stroke="#C92C1E" 
                strokeWidth={3} 
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                activeDot={{ r: 6, stroke: '#C92C1E', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/60 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Distribusi Status Owner</h3>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#111827' }} 
                  itemStyle={{ color: '#111827', fontWeight: 500 }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/60 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Top 5 Lokasi Owner (Kota)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 500 }} width={100} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', color: '#111827' }} 
                  itemStyle={{ color: '#111827', fontWeight: 500 }}
                  labelStyle={{ color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}
                />
                <Bar dataKey="Total" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
