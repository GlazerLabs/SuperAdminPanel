"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchCampaignLinks, fetchCampaignLinkStats } from "@/campaignsAnalyticsApi";

const LINK_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "default", label: "Default" },
  { value: "promo", label: "Promo" },
  { value: "referral", label: "Referral" },
  { value: "campaign", label: "Campaign" },
  { value: "events", label: "Events" },
];

const DEFAULT_LINK_TYPE = "promo";

const pickString = (source, keys, fallback = "") => {
  if (!source || typeof source !== "object") return fallback;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return fallback;
};

const unwrapPayload = (response) => {
  if (!response) return null;
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.links)) return response.links;
  if (response?.data && typeof response.data === "object" && !Array.isArray(response.data)) {
    if (Array.isArray(response.data.links)) return response.data.links;
    return response.data;
  }
  return response;
};

const HIDDEN_LINK_NAMES = new Set(["keyurvastani"]);

const normalizeLinks = (response) => {
  const payload = unwrapPayload(response);
  const rows = Array.isArray(payload) ? payload : [];

  return rows
    .map((row, index) => {
      const slug = pickString(row, ["slug"], "");
      const mongoId = pickString(row, ["id", "linkId", "link_id", "_id"], "");
      const name = pickString(
        row,
        ["linkName", "link_name", "name", "title", "label", "campaignName", "campaign_name", "slug"],
        slug || mongoId || `Link ${index + 1}`
      );
      const shortUrl = pickString(row, ["shortUrl", "short_url", "url", "link"], "");
      const mediaSource = pickString(row, ["mediaSource", "media_source", "source"], "");

      return {
        id: mongoId || slug || `row-${index}`,
        statsId: slug || mongoId,
        name,
        shortUrl,
        slug,
        mediaSource,
        raw: row,
      };
    })
    .filter((row) => row.statsId)
    .filter((row) => !HIDDEN_LINK_NAMES.has(String(row.name || "").trim().toLowerCase()));
};

const sumInstallType = (entries, matchers) => {
  if (!Array.isArray(entries)) return 0;
  const wanted = new Set(matchers.map((m) => String(m).toLowerCase()));
  return entries.reduce((sum, row) => {
    const type = String(row?.installedType ?? row?.type ?? row?.name ?? "").toLowerCase();
    if (!wanted.has(type)) return sum;
    const n = Number(row?.count ?? row?.value ?? 0);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
};

const eventCount = (events, eventNames) => {
  const rows = Array.isArray(events?.byEventName) ? events.byEventName : [];
  const wanted = new Set(eventNames.map((n) => String(n).toLowerCase()));
  return rows.reduce((sum, row) => {
    const name = String(row?.eventName ?? row?.name ?? "").toLowerCase();
    if (!wanted.has(name)) return sum;
    const n = Number(row?.count ?? row?.value ?? 0);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
};

/**
 * Maps /api/links/stats/:slug response:
 * {
 *   clicks: {
 *     registeredUsers,
 *     installsByType: [{ count, installedType: "install"|"reinstall" }]
 *   },
 *   events: { byEventName: [{ count, eventName: "APP_INSTALLED" }] }
 * }
 */
const normalizeStats = (response) => {
  const root =
    response && typeof response === "object" && !Array.isArray(response) ? response : {};
  const clicks = root?.clicks && typeof root.clicks === "object" ? root.clicks : {};
  const events = root?.events && typeof root.events === "object" ? root.events : {};
  const installsByType = Array.isArray(clicks.installsByType) ? clicks.installsByType : [];

  const installsFromType = sumInstallType(installsByType, ["install", "installs", "new_install"]);
  const reinstalls = sumInstallType(installsByType, ["reinstall", "reinstalls"]);
  const appInstalled = eventCount(events, ["APP_INSTALLED"]);

  return {
    // Prefer installsByType "install"; fall back to APP_INSTALLED event when absent
    installs: installsFromType || appInstalled,
    reinstalls,
    registrations: Number(clicks.registeredUsers) || 0,
    clicks: Number(clicks.totalTrackedClicks) || 0,
    events: Number(events.totalEvents) || 0,
  };
};

const formatCount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN").format(n);
};

const ShimmerCard = () => (
  <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 animate-pulse">
    <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
    <div className="h-4 w-40 rounded bg-slate-200" />
    <div className="mt-2 h-3 w-28 rounded bg-slate-100" />
    <div className="mt-6 grid grid-cols-3 gap-3">
      <div className="h-16 rounded-xl bg-slate-100" />
      <div className="h-16 rounded-xl bg-slate-100" />
      <div className="h-16 rounded-xl bg-slate-100" />
    </div>
  </div>
);

const MetricCell = ({ label, value, tone }) => {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };

  return (
    <div className={`rounded-xl px-3 py-3 text-center ring-1 ${tones[tone] || tones.indigo}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-slate-900">
        {formatCount(value)}
      </p>
    </div>
  );
};

const CampaignCard = ({ link }) => {
  const stats = link.stats || {
    installs: 0,
    reinstalls: 0,
    registrations: 0,
    clicks: 0,
    events: 0,
  };
  const statsError = link.statsError;
  const linkUrl = link.shortUrl || (link.slug ? `/${link.slug}` : "");

  return (
    <article className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-shadow duration-300 hover:shadow-lg">
      <div className="absolute right-0 top-0 h-28 w-28 translate-x-6 -translate-y-6 rounded-full bg-indigo-500/10" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-slate-900">{link.name}</p>
            {linkUrl ? (
              <p className="mt-1 truncate text-xs font-medium text-indigo-600">{linkUrl}</p>
            ) : null}
            {link.mediaSource ? (
              <p className="mt-2 truncate text-xs font-semibold text-violet-600">{link.mediaSource}</p>
            ) : null}
          </div>
          <div className="shrink-0 rounded-xl bg-amber-50 px-3 py-2 text-center ring-1 ring-amber-100">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Clicks</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums tracking-tight text-slate-900">
              {formatCount(stats.clicks)}
            </p>
          </div>
        </div>

        {statsError ? (
          <p className="mt-5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
            {statsError}
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-3 gap-3">
            <MetricCell label="Install" value={stats.installs} tone="indigo" />
            <MetricCell label="Reinstall" value={stats.reinstalls} tone="sky" />
            <MetricCell label="Registration" value={stats.registrations} tone="emerald" />
          </div>
        )}
      </div>
    </article>
  );
};

function LinkTypeFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = LINK_TYPE_OPTIONS.find((opt) => opt.value === value) || LINK_TYPE_OPTIONS[0];

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-w-38 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected.label}</span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-500" fill="currentColor" aria-hidden>
          <path d="M5.25 7.5 10 12.25 14.75 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 z-30 mt-2 min-w-44 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl"
        >
          {LINK_TYPE_OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value || "all"}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                  active ? "bg-slate-800 text-white" : "text-slate-100 hover:bg-slate-800/80"
                }`}
              >
                <span className="inline-flex w-4 justify-center text-xs">{active ? "✓" : ""}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function CampaignsAnalyticsPage() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [linkType, setLinkType] = useState(DEFAULT_LINK_TYPE);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const linksResponse = await fetchCampaignLinks(linkType);
      const normalized = normalizeLinks(linksResponse);

      const withStats = await Promise.all(
        normalized.map(async (link) => {
          try {
            const statsResponse = await fetchCampaignLinkStats(link.statsId);
            return { ...link, stats: normalizeStats(statsResponse), statsError: "" };
          } catch (err) {
            return {
              ...link,
              stats: { installs: 0, reinstalls: 0, registrations: 0, clicks: 0, events: 0 },
              statsError: err?.message || "Failed to load stats",
            };
          }
        })
      );

      withStats.sort(
        (a, b) => (Number(b?.stats?.clicks) || 0) - (Number(a?.stats?.clicks) || 0)
      );

      setLinks(withStats);
    } catch (err) {
      setLinks([]);
      setError(err?.message || "Failed to load campaigns analytics");
    } finally {
      setLoading(false);
    }
  }, [linkType]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    return links.reduce(
      (acc, link) => {
        acc.clicks += Number(link?.stats?.clicks) || 0;
        acc.installs += Number(link?.stats?.installs) || 0;
        acc.reinstalls += Number(link?.stats?.reinstalls) || 0;
        return acc;
      },
      { clicks: 0, installs: 0, reinstalls: 0 }
    );
  }, [links]);

  return (
    <main className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Campaigns Analytics</h2>
          <p className="mt-1 text-sm text-slate-500">
            Campaign links with installs, reinstalls, and registrations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LinkTypeFilter value={linkType} onChange={setLinkType} />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Clicks", value: totals.clicks, accent: "bg-amber-500/10" },
          { label: "Total Installs", value: totals.installs, accent: "bg-indigo-500/10" },
          { label: "Total Reinstall", value: totals.reinstalls, accent: "bg-sky-500/10" },
        ].map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80"
          >
            <div className={`absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full ${card.accent}`} />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
              {loading ? "—" : formatCount(card.value)}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <ShimmerCard key={`shimmer-${i}`} />)
          : links.length === 0
            ? (
              <div className="sm:col-span-2 xl:col-span-3 rounded-2xl bg-white px-6 py-16 text-center shadow-md ring-1 ring-slate-200/80">
                <p className="text-base font-semibold text-slate-800">No campaign links found</p>
                <p className="mt-1 text-sm text-slate-500">Links for this type will appear here once available.</p>
              </div>
            )
            : links.map((link) => <CampaignCard key={link.id} link={link} />)}
      </section>
    </main>
  );
}
