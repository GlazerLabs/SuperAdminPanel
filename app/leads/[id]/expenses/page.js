"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getApi } from "@/api";

function formatMoney(n) {
  if (n === undefined || n === null || n === "") return "—";
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  const absNum = Math.abs(num);
  const formatUnit = (divisor, suffix) => {
    const scaled = num / divisor;
    const rounded = Number(scaled.toFixed(1));
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}${suffix}`;
  };
  if (absNum >= 10000000) return `₹${formatUnit(10000000, "Cr")}`;
  if (absNum >= 100000) return `₹${formatUnit(100000, "L")}`;
  if (absNum >= 1000) return `₹${formatUnit(1000, "K")}`;
  return `₹${Math.round(num)}`;
}

function sliceDate(v) {
  if (!v) return "";
  return String(v).slice(0, 10);
}

function parseLeadFromApi(json, id) {
  if (!json || json.status !== 1) return null;
  const d = json.data;
  if (d && typeof d === "object" && !Array.isArray(d)) return d;
  if (Array.isArray(d)) {
    return d.find((x) => String(x?.id) === String(id)) || d[0] || null;
  }
  return null;
}

function sortUpdates(updates) {
  if (!Array.isArray(updates)) return [];
  return [...updates].sort((a, b) => {
    const ca = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const cb = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return cb - ca;
  });
}

export default function LeadExpensesPage() {
  const params = useParams();
  const id = params?.id;
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadLead() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        let raw = null;
        try {
          raw = await getApi("lead-tracking", { id });
        } catch {
          raw = null;
        }
        let row = parseLeadFromApi(raw, id);
        if (!row) {
          const listJson = await getApi("lead-tracking", { page: 1, limit: 200 });
          row = parseLeadFromApi(listJson, id);
        }
        if (!row) throw new Error("Lead not found");
        if (mounted) setLead(row);
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to load expense history.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadLead();
    return () => {
      mounted = false;
    };
  }, [id]);

  const updates = useMemo(() => sortUpdates(lead?.lead_updates), [lead]);
  const expenseRows = useMemo(() => {
    return updates
      .filter((u) => Number(u?.expense_after ?? 0) !== Number(u?.expense_before ?? 0))
      .map((u) => {
        const before = Number(u?.expense_before ?? 0) || 0;
        const after = Number(u?.expense_after ?? 0) || 0;
        return {
          id: u.id,
          date: sliceDate(u.update_date || u.created_at),
          before,
          after,
          delta: after - before,
          by: u?.username || u?.full_name || `User ${u?.created_by_id ?? ""}`,
          summary: u?.discussion_summary || u?.internal_notes || "Expense updated",
        };
      });
  }, [updates]);

  const totalChange = useMemo(
    () => expenseRows.reduce((sum, row) => sum + Number(row.delta || 0), 0),
    [expenseRows]
  );

  const largestSpike = useMemo(
    () => expenseRows.reduce((max, row) => Math.max(max, Number(row.delta || 0)), 0),
    [expenseRows]
  );

  const lastUpdatedOn = expenseRows[0]?.date || "—";

  return (
    <main className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/leads/${id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            ← Back to lead
          </Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Expense History</h1>
          <p className="mt-1 text-sm text-slate-600">
            {lead?.brand || "Lead"} · {lead?.activity || "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Current</p>
            <p className="text-base font-bold text-slate-900">{formatMoney(lead?.expected_expenses || 0)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Net</p>
            <p className={`text-base font-bold ${totalChange >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {totalChange >= 0 ? "+" : ""}{formatMoney(totalChange)}
            </p>
          </div>
        </div>
      </section>

      {!loading && !error && (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Entries</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{expenseRows.length}</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Net Expense Change</p>
            <p className={`mt-2 text-2xl font-bold ${totalChange >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {totalChange >= 0 ? "+" : ""}{formatMoney(totalChange)}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Largest Spike</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(largestSpike)}</p>
            <p className="mt-1 text-xs text-slate-500">Last updated: {lastUpdatedOn}</p>
          </div>
        </section>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
      ) : expenseRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 shadow-sm">
          No expense change entries found yet.
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Expense Movement Log</p>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Before</th>
                <th className="px-4 py-3">After</th>
                <th className="px-4 py-3">Change</th>
                <th className="px-4 py-3">Updated by</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenseRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-700">{row.date || "—"}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{formatMoney(row.before)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatMoney(row.after)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.delta >= 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {row.delta >= 0 ? "+" : ""}{formatMoney(row.delta)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.by}</td>
                  <td className="px-4 py-3 text-slate-600">{row.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
