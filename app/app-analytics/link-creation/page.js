"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  createDynamicLink,
  deleteDynamicLink,
  fetchDynamicLinks,
  updateDynamicLink,
} from "@/trackingDynamicLinksApi";
import { getApi } from "@/api";

function LinkClicksTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{payload[0].value} clicks</p>
    </div>
  );
}

const extractCategory = (targetPath = "") => {
  const raw = String(targetPath || "").trim();
  if (!raw) return "other";

  let path = raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      path = new URL(raw).pathname;
    } catch {
      path = raw;
    }
  }

  const appIdx = path.indexOf("/app/");
  if (appIdx === -1) return "other";

  const after = path.slice(appIdx + 5);
  const segment = after.split("/")[0]?.split("?")[0]?.trim();
  return segment || "other";
};

const toLabel = (value = "") => {
  const v = String(value || "").trim();
  if (!v) return "Other";
  return v.charAt(0).toUpperCase() + v.slice(1);
};

const stripDomain = (url = "") => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return parsed.pathname + parsed.search;
  } catch {
    return raw;
  }
};

const extractAppPath = (targetPath = "") => {
  const raw = String(targetPath || "").trim();
  if (!raw) return raw;
  let path = raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      path = new URL(raw).pathname;
    } catch {
      path = raw;
    }
  }
  const appIdx = path.indexOf("/app/");
  if (appIdx !== -1) return path.slice(appIdx);
  return path;
};

const CATEGORY_COLORS = {
  tournament: { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700", accent: "text-violet-600" },
  game: { bg: "bg-sky-50", border: "border-sky-200", badge: "bg-sky-100 text-sky-700", accent: "text-sky-600" },
  profile: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", accent: "text-amber-600" },
  other: { bg: "bg-slate-50", border: "border-slate-200", badge: "bg-slate-100 text-slate-700", accent: "text-slate-600" },
};

const getCategoryStyle = (category) => CATEGORY_COLORS[category] || CATEGORY_COLORS.other;

const normalizeLinks = (response) => {
  const payload = response?.data ?? response;
  const links = Array.isArray(payload?.links) ? payload.links : Array.isArray(payload) ? payload : [];

  return links.map((row) => {
    const clicks = Number(row?.clickCount ?? row?.clicks ?? 0) || 0;
    const target = row?.targetPath || row?.webUrl || "";
    const slug = String(row?.slug || "");

    return {
      slug,
      target,
      shortUrl: row?.shortUrl || (slug ? `https://thryl.io/l/${slug}` : ""),
      clicks,
      isActive: row?.isActive !== false,
      status: row?.isActive !== false ? "Active" : "Inactive",
      createdAt: row?.createdAt ? new Date(row.createdAt).toLocaleString() : "-",
      updatedAt: row?.updatedAt ? new Date(row.updatedAt).toLocaleString() : "-",
      category: extractCategory(target),
    };
  });
};

const ShimmerStatCard = ({ accent = "bg-indigo-500/10" }) => (
  <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 animate-pulse">
    <div className={`absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full ${accent}`} />
    <div className="h-3 w-24 rounded bg-slate-200" />
    <div className="mt-3 h-8 w-20 rounded bg-slate-200" />
  </div>
);

const extractTournamentId = (targetPath = "") => {
  const match = String(targetPath || "").match(/\/tournament\/(\d+)/);
  return match ? match[1] : null;
};

export default function LinkCreationPage() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [targetPathInput, setTargetPathInput] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [saving, setSaving] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [editTargetPath, setEditTargetPath] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [deletingLink, setDeletingLink] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);
  const [tournamentTitles, setTournamentTitles] = useState({});
  const [copiedSlug, setCopiedSlug] = useState(null);

  const loadLinks = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchDynamicLinks();
      setLinks(normalizeLinks(response));
    } catch (err) {
      setError(err?.message || "Failed to load links");
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  useEffect(() => {
    if (!links.length) return;
    let mounted = true;

    const ids = [...new Set(links.map((l) => extractTournamentId(l.target)).filter(Boolean))];
    if (!ids.length) return;

    (async () => {
      const titles = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await getApi("tournament", { tournament_id: Number(id) });
            const arr = Array.isArray(res?.data) ? res.data : [];
            const row = arr[0] || res?.data?.tournament || res?.data || {};
            const title = row?.title || row?.name || null;
            if (title) titles[id] = title;
          } catch {
            // silently skip
          }
        })
      );
      if (mounted) setTournamentTitles((prev) => ({ ...prev, ...titles }));
    })();

    return () => { mounted = false; };
  }, [links]);

  const performanceData = useMemo(() => {
    const bucket = new Map();
    links.forEach((row) => {
      const key = row.category || "other";
      const prev = bucket.get(key) || 0;
      bucket.set(key, prev + row.clicks);
    });

    return Array.from(bucket.entries())
      .map(([name, clicks]) => ({ name: toLabel(name), clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8);
  }, [links]);

  const totalLinks = links.length;
  const totalClicks = links.reduce((sum, row) => sum + row.clicks, 0);
  const activeLinks = links.filter((row) => row.isActive).length;
  const avgClicks = totalLinks ? (totalClicks / totalLinks).toFixed(1) : "0";

  const topCards = [
    { label: "Total Links", value: totalLinks, accent: "bg-indigo-500/10" },
    { label: "Total Clicks", value: totalClicks, accent: "bg-sky-500/10" },
    { label: "Active Links", value: activeLinks, accent: "bg-emerald-500/10" },
    { label: "Avg Clicks/Link", value: avgClicks, accent: "bg-violet-500/10" },
  ];

  const onCreate = async () => {
    const targetPath = targetPathInput.trim();
    if (!targetPath) {
      setError("Target path is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = { targetPath };
      if (slugInput.trim()) payload.slug = slugInput.trim();
      await createDynamicLink(payload);
      setTargetPathInput("");
      setSlugInput("");
      setIsCreateOpen(false);
      await loadLinks();
    } catch (err) {
      setError(err?.message || "Failed to create link");
    } finally {
      setSaving(false);
    }
  };

  const openUpdateModal = (row) => {
    setEditingLink(row);
    setEditTargetPath(row.target || "");
    setEditSlug(row.slug || "");
  };

  const onUpdateConfirm = async () => {
    if (!editingLink) return;
    const nextTarget = editTargetPath.trim();
    if (!nextTarget) {
      setError("Target path is required for update");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await updateDynamicLink(editingLink.slug, {
        targetPath: nextTarget,
        slug: editSlug.trim() || editingLink.slug,
        isActive: editingLink.isActive,
      });
      setEditingLink(null);
      setSelectedLink(null);
      await loadLinks();
    } catch (err) {
      setError(err?.message || "Failed to update link");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteConfirm = async () => {
    if (!deletingLink) return;

    setSaving(true);
    setError("");
    try {
      await deleteDynamicLink(deletingLink.slug);
      setDeletingLink(null);
      setSelectedLink(null);
      await loadLinks();
    } catch (err) {
      setError(err?.message || "Failed to delete link");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-6">
      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? topCards.map((card) => <ShimmerStatCard key={`shimmer-${card.label}`} accent={card.accent} />)
          : topCards.map((card) => (
              <div
                key={card.label}
                className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg"
              >
                <div className={`absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full ${card.accent}`} />
                <p className="text-sm font-medium uppercase tracking-wider text-slate-500">{card.label}</p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{card.value}</p>
              </div>
            ))}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-indigo-100/60">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-indigo-900">Link Clicks Overview</h4>
        <p className="mt-1 text-sm text-slate-600">Grouped by target path category (e.g. tournament, game, profile).</p>
        <div className="mt-4 h-[340px]">
          {loading ? (
            <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="linkClicksGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eef2ff" strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip content={<LinkClicksTooltip />} cursor={{ fill: "#e2e8f0", fillOpacity: 0.35 }} />
                <Bar dataKey="clicks" radius={[10, 10, 0, 0]} fill="url(#linkClicksGrad)" barSize={38} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Generated Links</h3>
            <p className="text-sm text-slate-500">Grouped by category</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">Total: {totalLinks}</span>
            <button type="button" onClick={() => setIsCreateOpen(true)} className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700">
              Create Link
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={`shimmer-${idx}`} className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200/60 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-28 rounded bg-slate-200" />
                    <div className="h-3 w-16 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="mt-4 h-3 w-10 rounded bg-slate-200" />
                <div className="mt-1.5 h-9 rounded-lg bg-slate-100" />
                <div className="mt-3 h-9 rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-medium text-slate-500">No links found.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {links.map((row) => {
              const tId = extractTournamentId(row.target);
              const tTitle = tId ? tournamentTitles[tId] : null;
              const displayName = tTitle || extractAppPath(row.target);
              const linkPath = stripDomain(row.shortUrl);
              const isCopied = copiedSlug === row.slug;

              const handleCopyLink = () => {
                navigator.clipboard.writeText(row.shortUrl || "");
                setCopiedSlug(row.slug);
                setTimeout(() => setCopiedSlug((prev) => (prev === row.slug ? null : prev)), 2000);
              };

              return (
                <div key={row.slug} className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200/60 transition-shadow hover:shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 shadow shadow-indigo-200">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-900">{displayName}</h3>
                      <p className="text-xs font-semibold uppercase text-slate-400">{toLabel(row.category)}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Link</p>
                    <div className="mt-1.5 flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2">
                      <span className="truncate text-xs font-medium text-indigo-600">{linkPath}</span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="ml-1.5 shrink-0 rounded p-1 text-indigo-300 transition-colors hover:bg-indigo-100 hover:text-indigo-500"
                      >
                        {isCopied ? (
                          <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {isCopied ? (
                      <p className="mt-1 text-[10px] font-semibold text-emerald-600">Link copied!</p>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registrations</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{row.clicks}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => openUpdateModal(row)}
                      title="Edit"
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingLink(row)}
                      title="Delete"
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-indigo-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Create Link</p>
                <h4 className="text-xl font-bold text-slate-900">New Dynamic Link</h4>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target Path / URL</span>
                <input
                  type="text"
                  value={targetPathInput}
                  onChange={(e) => setTargetPathInput(e.target.value)}
                  placeholder="/app/tournament/271 or https://thryl.io/app/tournament/271"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Custom Slug (Optional)</span>
                <input
                  type="text"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  placeholder="optional-slug"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={saving} onClick={onCreate} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Saving..." : "Create Link"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingLink ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-indigo-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Update Link</p>
                <h4 className="text-xl font-bold text-slate-900">/l/{editingLink.slug}</h4>
              </div>
              <button type="button" onClick={() => setEditingLink(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target Path / URL</span>
                <input type="text" value={editTargetPath} onChange={(e) => setEditTargetPath(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800" />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Slug</span>
                <input type="text" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800" />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={() => setEditingLink(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={saving} onClick={onUpdateConfirm} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">{saving ? "Saving..." : "Update Link"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingLink ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-100 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">Warning</p>
              <h4 className="mt-1 text-xl font-bold text-slate-900">Delete Dynamic Link?</h4>
            </div>
            <div className="px-5 py-4 text-sm text-slate-600">
              This action will permanently remove <span className="font-semibold text-slate-900">/l/{deletingLink.slug}</span>. This cannot be undone.
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={() => setDeletingLink(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={saving} onClick={onDeleteConfirm} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50">{saving ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
