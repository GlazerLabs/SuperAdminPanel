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
    if (ca !== cb) return cb - ca;
    const da = sliceDate(a.update_date) || "";
    const db = sliceDate(b.update_date) || "";
    if (da !== db) return db.localeCompare(da);
    return Number(b.id || 0) - Number(a.id || 0);
  });
}

function pickExpensesArray(row) {
  if (!row) return [];
  const raw =
    row.expenses ??
    row.expense_entries ??
    row.expense_list ??
    row.expence_list ??
    row.lead_expenses ??
    row.lead_expences;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === "object");
}

function sumExpensePayments(row, updatesSorted) {
  const arr = pickExpensesArray(row);
  if (arr.length > 0) {
    return arr.reduce((sum, item) => {
      const n = Number(item?.payment);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }
  if (!Array.isArray(updatesSorted)) return 0;
  return updatesSorted.reduce((sum, item) => {
    const n = Number(item?.payment);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function mapUpdateToPaymentRow(u) {
  const payment = Number(u?.payment) || 0;
  return {
    id: u.id ?? `${sliceDate(u.update_date || u.created_at)}-${payment}-${u.paid_for}`,
    date: sliceDate(u.update_date || u.created_at),
    payment,
    paid_for: u.paid_for || "—",
    paid_to: u.paid_to || "—",
    description: u.description || u.expense_description || "",
    expence_link: u.expence_link || u.links_attachments || "",
    by: u?.username || u?.full_name || `User ${u?.created_by_id ?? ""}`,
    update_type: u.update_type || "",
  };
}

function mapArrayItemToPaymentRow(item, idx) {
  const payment = Number(item?.payment) || 0;
  return {
    id: item.id ?? `exp-${idx}-${payment}`,
    date: sliceDate(item.created_at || item.date || item.update_date || ""),
    payment,
    paid_for: item.paid_for || "—",
    paid_to: item.paid_to || "—",
    description: item.description || item.expense_description || "",
    expence_link: item.expence_link || item.expense_link || "",
    by: item.username || item.full_name || "—",
    update_type: item.update_type || "",
  };
}

/** Card + amount styling vs forecast (same thresholds as lead detail). */
function ledgerSpendPresentation(spent, forecast) {
  const s = Number(spent) || 0;
  const f = Number(forecast) || 0;
  if (f <= 0) {
    return {
      card: "border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]",
      amount: "text-slate-900",
      badge: "bg-slate-100 text-slate-600",
      badgeText: "No forecast set",
    };
  }
  if (s > f) {
    return {
      card: "border-rose-200/90 bg-gradient-to-br from-rose-50/90 to-white shadow-md shadow-rose-900/5 ring-1 ring-rose-900/[0.06]",
      amount: "text-rose-700",
      badge: "bg-rose-100 text-rose-800",
      badgeText: "Above budget",
    };
  }
  if (s >= f * 0.9) {
    return {
      card: "border-amber-200/90 bg-gradient-to-br from-amber-50/80 to-white shadow-md shadow-amber-900/5 ring-1 ring-amber-900/[0.05]",
      amount: "text-amber-800",
      badge: "bg-amber-100 text-amber-900",
      badgeText: "Near ceiling (≥90%)",
    };
  }
  return {
    card: "border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 to-white shadow-md shadow-emerald-900/5 ring-1 ring-emerald-900/[0.04]",
    amount: "text-emerald-800",
    badge: "bg-emerald-100 text-emerald-900",
    badgeText: "Within plan",
  };
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

  const expenseForecast = useMemo(() => {
    const latest = updates[0] || null;
    return Number(latest?.expense_after ?? lead?.expected_expenses ?? 0) || 0;
  }, [updates, lead]);

  const paymentLineRows = useMemo(() => {
    const fromUpdates = updates.filter((u) => Number(u?.payment) > 0).map(mapUpdateToPaymentRow);
    if (fromUpdates.length > 0) return fromUpdates;
    const arr = pickExpensesArray(lead);
    return arr.map(mapArrayItemToPaymentRow);
  }, [updates, lead]);

  const totalLinePayments = useMemo(
    () => paymentLineRows.reduce((sum, row) => sum + Number(row.payment || 0), 0),
    [paymentLineRows]
  );

  const sumPaymentsLikeDetail = useMemo(() => sumExpensePayments(lead, updates), [lead, updates]);

  const largestLinePayment = useMemo(
    () => paymentLineRows.reduce((max, row) => Math.max(max, Number(row.payment || 0)), 0),
    [paymentLineRows]
  );

  const lastUpdatedOn = paymentLineRows[0]?.date || "—";

  const hasLineItems = paymentLineRows.length > 0;
  const showEmpty = !loading && !error && !hasLineItems;

  const cumulativePresentation = useMemo(
    () => ledgerSpendPresentation(totalLinePayments, expenseForecast),
    [totalLinePayments, expenseForecast]
  );

  return (
    <main className="relative -mx-6 max-w-none bg-slate-50 pb-36 pt-6 sm:pb-44 sm:pt-8 md:pb-52">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(32rem,55vh)] bg-[radial-gradient(ellipse_100%_70%_at_50%_-5%,rgb(199_210_254)_0%,transparent_58%)] opacity-95"
        aria-hidden
      />
      <div className="relative w-full max-w-none px-6 sm:px-8 lg:px-10 xl:px-12 2xl:px-14">
        <section className="flex flex-col gap-8 xl:grid xl:grid-cols-12 xl:items-start xl:gap-10">
          <div className="min-w-0 xl:col-span-7">
            <Link
              href={`/leads/${id}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-slate-900/5 transition hover:border-indigo-200 hover:bg-indigo-50/80"
            >
              <span className="text-slate-400" aria-hidden>
                ←
              </span>
              Back to lead
            </Link>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Expense history</h1>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-800">{lead?.brand || "Lead"}</span>
              <span className="text-slate-400"> · </span>
              <span>{lead?.activity || "—"}</span>
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Verified cash out vs expense forecast — same numbers as the lead commercial card.
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row xl:col-span-5 xl:max-w-none xl:justify-end xl:gap-4">
            <div className="min-w-0 flex-1 rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-lg shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04] backdrop-blur-sm sm:min-w-[200px] xl:flex-1">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Verified spend</p>
              </div>
              <p className="mt-1 text-xs leading-snug text-slate-500">Total expenses added for this deal</p>
              <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
                {formatMoney(sumPaymentsLikeDetail)}
              </p>
            </div>
            <div className="min-w-0 flex-1 rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/50 p-5 shadow-lg shadow-indigo-900/[0.07] ring-1 ring-indigo-900/[0.05] backdrop-blur-sm sm:min-w-[200px] xl:flex-1">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </span>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-800/80">Expense forecast</p>
              </div>
              <p className="mt-1 text-xs leading-snug text-indigo-900/60">Latest follow-up or deal record</p>
              <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-indigo-950 sm:text-3xl">
                {formatMoney(expenseForecast)}
              </p>
            </div>
          </div>
        </section>

        {!loading && !error && hasLineItems ? (
          <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 xl:gap-6">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Total entries</p>
              <p className="mt-1 text-sm text-slate-500">Rows in this table</p>
              <p className="mt-4 text-3xl font-bold tabular-nums text-slate-900">{paymentLineRows.length}</p>
            </div>
            <div className={`rounded-2xl p-6 ${cumulativePresentation.card}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Cumulative disbursements</p>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cumulativePresentation.badge}`}>
                  {cumulativePresentation.badgeText}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Sum of payment lines</p>
              <p className={`mt-4 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl ${cumulativePresentation.amount}`}>
                {formatMoney(totalLinePayments)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/20 p-6 shadow-md shadow-slate-900/[0.04] ring-1 ring-amber-900/[0.04] sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-900/70">Peak single outlay</p>
              <p className="mt-1 text-sm text-slate-600">Largest one-line payment</p>
              <p className="mt-4 text-3xl font-bold tabular-nums text-slate-900">{formatMoney(largestLinePayment)}</p>
              <p className="mt-3 text-xs font-medium text-slate-500">Last activity · {lastUpdatedOn}</p>
            </div>
          </section>
        ) : null}

        <div className="mt-10 scroll-mt-8">
          {loading ? (
            <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-8 shadow-lg ring-1 ring-slate-900/[0.03]">
              <div className="h-4 w-48 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50/90 px-6 py-8 text-rose-800 shadow-sm ring-1 ring-rose-900/10">
              <p className="font-semibold">Something went wrong</p>
              <p className="mt-2 text-sm text-rose-700/90">{error}</p>
            </div>
          ) : showEmpty ? (
            <div className="rounded-3xl border border-dashed border-slate-300/90 bg-white px-8 py-16 text-center shadow-lg ring-1 ring-slate-900/[0.03]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="mt-6 text-lg font-semibold text-slate-800">No disbursements yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                Record an expense from the lead detail page. Entries appear here as soon as they are saved.
              </p>
              <Link
                href={`/leads/${id}`}
                className="mt-8 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition hover:bg-indigo-700"
              >
                Go to lead
              </Link>
            </div>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.04]">
              <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 px-6 py-5 sm:px-8 lg:px-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-900/50">Ledger</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">Disbursement detail</h2>
                <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-600 lg:text-base">
                  Auditable payment lines from deal activity — amount, purpose, payee, optional proof link, and who recorded it.
                </p>
              </div>
              <div className="overflow-x-auto overscroll-x-contain pb-6 sm:pb-10">
                <table className="w-full min-w-[44rem] table-fixed text-center text-sm lg:min-w-0">
                  <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 shadow-sm backdrop-blur-sm">
                    <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="w-[14%] whitespace-nowrap px-3 py-4 pl-4 sm:pl-6 lg:pl-8">Date</th>
                      <th className="w-[14%] whitespace-nowrap px-3 py-4">Payment</th>
                      <th className="w-[22%] px-3 py-4">Paid for</th>
                      <th className="w-[22%] px-3 py-4">Paid to</th>
                      <th className="w-[14%] px-3 py-4">Proof</th>
                      <th className="w-[14%] px-3 py-4 pr-4 sm:pr-6 lg:pr-8">Recorded by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentLineRows.map((row, i) => (
                      <tr
                        key={row.id}
                        className={`transition-colors hover:bg-indigo-50/50 ${i % 2 === 1 ? "bg-slate-50/40" : "bg-white"}`}
                      >
                        <td className="px-3 py-4 pl-4 align-middle sm:pl-6 lg:pl-8">
                          <div className="flex justify-center">
                            <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 tabular-nums">
                              {row.date || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 align-middle">
                          <span className="text-base font-bold tabular-nums text-slate-900">{formatMoney(row.payment)}</span>
                        </td>
                        <td className="break-words px-3 py-4 align-middle font-medium text-slate-800">{row.paid_for}</td>
                        <td className="break-words px-3 py-4 align-middle text-slate-700">{row.paid_to}</td>
                        <td className="px-3 py-4 align-middle">
                          <div className="flex justify-center">
                            {row.expence_link ? (
                              <a
                                href={
                                  /^https?:\/\//i.test(String(row.expence_link))
                                    ? String(row.expence_link)
                                    : `https://${String(row.expence_link).replace(/^\/+/, "")}`
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 transition hover:border-indigo-300 hover:bg-indigo-100"
                                target="_blank"
                                rel="noopener noreferrer"
                                title={row.expence_link}
                              >
                                Open
                                <span aria-hidden className="text-indigo-500">
                                  ↗
                                </span>
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="break-words px-3 py-4 pr-4 align-middle text-slate-600 sm:pr-6 lg:pr-8">{row.by}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr aria-hidden>
                      <td colSpan={6} className="h-12 border-0 bg-transparent p-0 sm:h-16" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
