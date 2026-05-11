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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`shimmer-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
                <div className="h-5 w-24 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-full rounded bg-slate-200" />
                <div className="mt-2 h-4 w-3/4 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-medium text-slate-500">No links found.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {links.map((row) => {
              const style = getCategoryStyle(row.category);
              const tId = extractTournamentId(row.target);
              const tTitle = tId ? tournamentTitles[tId] : null;
              return (
                <article
                  key={row.slug}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedLink(row)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedLink(row); }}
                  className={`cursor-pointer rounded-2xl border ${style.border} ${style.bg} p-4 shadow-sm transition-all hover:shadow-md hover:scale-[1.01]`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {tTitle ? (
                        <p className="truncate text-sm font-bold text-slate-900">{tTitle}</p>
                      ) : null}
                      <p className={`truncate text-sm ${tTitle ? "text-slate-500" : `font-bold ${style.accent}`}`}>{extractAppPath(row.target)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                      {row.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate font-medium text-slate-700">/l/{row.slug}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-white px-2 py-0.5 font-bold text-slate-900 shadow-sm ring-1 ring-slate-200">{row.clicks} click{row.clicks !== 1 ? "s" : ""}</span>
                      <span className={`rounded-full px-2 py-0.5 font-bold uppercase ${style.badge}`}>{toLabel(row.category)}</span>
                    </div>
                  </div>
                </article>
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

      {selectedLink ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Link Details</p>
                <h4 className="text-xl font-bold text-slate-900">/l/{selectedLink.slug}</h4>
              </div>
              <button type="button" onClick={() => setSelectedLink(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
            </div>

            <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 text-sm">
              <p><span className="font-semibold text-slate-700">Target:</span> <span className="text-slate-600 break-all">{selectedLink.target}</span></p>
              <p><span className="font-semibold text-slate-700">Short URL:</span> <span className="text-indigo-700 break-all">{selectedLink.shortUrl}</span></p>
              <p><span className="font-semibold text-slate-700">Category:</span> <span className="text-slate-600">{toLabel(selectedLink.category)}</span></p>
              <p><span className="font-semibold text-slate-700">Clicks:</span> <span className="text-slate-600">{selectedLink.clicks}</span></p>
              <p><span className="font-semibold text-slate-700">Created:</span> <span className="text-slate-600">{selectedLink.createdAt}</span></p>
              <p><span className="font-semibold text-slate-700">Updated:</span> <span className="text-slate-600">{selectedLink.updatedAt}</span></p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedLink(null);
                  openUpdateModal(selectedLink);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Update
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedLink(null);
                  setDeletingLink(selectedLink);
                }}
                className="rounded-xl border border-rose-100 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >
                Delete
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
