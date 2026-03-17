"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function PlaystoreInstallsChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/playstore");
        const json = await res.json();

        if (!res.ok || !json.success || !Array.isArray(json.data)) {
          throw new Error(json.error || "Invalid response from Play Store API");
        }

        const mapped =
          json.data
            .map((row) => {
              const rawDate =
                typeof row.date === "object" && row.date !== null
                  ? row.date.value
                  : row.date;

              return {
                date: rawDate,
                installs: Number(row.installs) || 0,
                uninstalls: Number(row.uninstalls) || 0,
              };
            })
            .reverse() || [];

        if (isMounted) {
          setData(mapped);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error loading Play Store data", err);
        if (isMounted) {
          setError(err.message || "Failed to load Play Store data");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <div className="h-72 rounded-2xl bg-slate-100 animate-pulse" />;
  }

  if (error) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-500">
        No Play Store data available.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Play Store installs vs uninstalls
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Last 30 days from BigQuery.
          </p>
        </div>
      </div>

      <div className="mt-5 h-[320px] sm:h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(79,70,229,0.03)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload;

                return (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-slate-900">{label}</p>
                    <p className="mt-1 text-slate-600">
                      Installs:{" "}
                      <span className="font-semibold text-slate-900">
                        {row.installs}
                      </span>
                    </p>
                    <p className="text-slate-600">
                      Uninstalls:{" "}
                      <span className="font-semibold text-slate-900">
                        {row.uninstalls}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="installs"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="uninstalls"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

