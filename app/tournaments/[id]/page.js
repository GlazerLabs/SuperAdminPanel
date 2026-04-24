"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import TournamentOrgChart from "@/components/Tournaments/TournamentOrgChart";
import { getApi } from "@/api";

function StatPill({ label, value }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-100/70 bg-linear-to-br from-white via-indigo-50/40 to-violet-50/50 px-4 py-3 shadow-[0_8px_24px_rgba(79,70,229,0.10)] ring-1 ring-indigo-100/60">
      <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-indigo-500/10" />
      <div className="relative text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="relative mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function TournamentDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = String(params?.id ?? "");
  const tournamentName = searchParams.get("name");
  const [hierarchyRoot, setHierarchyRoot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tournamentStatus, setTournamentStatus] = useState("Unknown");

  const tournamentLabel = useMemo(() => tournamentName || `Tournament #${id}`, [id, tournamentName]);
  const hierarchyInfo = useMemo(() => {
    if (!hierarchyRoot) return "No hierarchy data";
    const walk = (node, depth = 1) => {
      if (!node) return { count: 0, maxDepth: depth - 1 };
      const children = Array.isArray(node.children) ? node.children : [];
      let count = 1;
      let maxDepth = depth;
      for (const child of children) {
        const childStats = walk(child, depth + 1);
        count += childStats.count;
        maxDepth = Math.max(maxDepth, childStats.maxDepth);
      }
      return { count, maxDepth };
    };
    const stats = walk(hierarchyRoot, 1);
    return `${stats.count} members · ${stats.maxDepth} levels`;
  }, [hierarchyRoot]);

  useEffect(() => {
    let mounted = true;
    const toStatusLabel = (value) => {
      const s = String(value ?? "").toLowerCase().trim();
      if (!s) return "Unknown";
      if (s === "registration_closed") return "Registration Closed";
      return s
        .split("_")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    };
    const pickTournamentRow = (json) => {
      const data = json?.data;
      if (Array.isArray(data) && data.length > 0) return data[0];
      if (data && typeof data === "object") return data;
      if (Array.isArray(json) && json.length > 0) return json[0];
      return null;
    };
    const typeToNodeKind = (value, fallbackType) => {
      const n = Number(value);
      if (n === 3) return "organizer";
      if (n === 4) return "team_member";
      if (n === 5) return "freelancer";
      const s = String(value ?? "").toLowerCase().trim();
      if (["user", "organizer", "team_member", "freelancer"].includes(s)) return s;
      return fallbackType;
    };

    const normalizeNode = (raw, fallbackType = "member") => {
      if (!raw || typeof raw !== "object") return null;
      const labelCandidate = raw.label ?? raw.name ?? raw.full_name ?? raw.title ?? raw.organization_name ?? raw.username ?? "";
      const childGroups = [
        ...(Array.isArray(raw.children) ? raw.children : []),
        ...(Array.isArray(raw.organizers) ? raw.organizers : []),
        ...(Array.isArray(raw.teams) ? raw.teams : []),
        ...(Array.isArray(raw.team_members) ? raw.team_members : []),
        ...(Array.isArray(raw.freelancers) ? raw.freelancers : []),
        ...(Array.isArray(raw.members) ? raw.members : []),
      ];

      const hasUsableIdentity =
        raw.id != null ||
        raw.user_id != null ||
        raw.organizer_id != null ||
        raw.team_member_id != null ||
        raw.freelancer_id != null ||
        raw.staff_id != null ||
        String(labelCandidate).trim() !== "" ||
        childGroups.length > 0;
      if (!hasUsableIdentity) return null;

      const idValue =
        raw.id ??
        raw.user_id ??
        raw.organizer_id ??
        raw.team_member_id ??
        raw.freelancer_id ??
        raw.staff_id ??
        String(labelCandidate).trim().toLowerCase().replace(/\s+/g, "-");

      const inferredType = typeToNodeKind(
        raw.type ??
          (raw.organizers ? "user" : null) ??
          (raw.team_members ? "organizer" : null) ??
          (raw.freelancers ? "team_member" : null) ??
          fallbackType,
        fallbackType
      );

      return {
        id: String(idValue),
        type: inferredType,
        label: String(labelCandidate).trim() || "Unnamed",
        meta: {
          ...(raw.meta && typeof raw.meta === "object" ? raw.meta : {}),
          email: raw.email ?? null,
          username: raw.username ?? null,
          profile_pic_url: raw.profile_pic_url ?? null,
        },
        children: childGroups.map((c) => normalizeNode(c)).filter(Boolean),
      };
    };

    const normalizeHierarchyResponse = (json) => {
      const payload = json?.data;
      if (Array.isArray(payload) && payload.length === 1) {
        return normalizeNode(payload[0], "user");
      }
      if (Array.isArray(payload) && payload.length > 1) {
        const children = payload.map((item) => normalizeNode(item, "organizer")).filter(Boolean);
        if (!children.length) return null;
        return { id: `tournament-${id}`, type: "user", label: tournamentLabel, meta: { tournament_id: id }, children };
      }
      if (payload && typeof payload === "object") {
        return normalizeNode(payload, "user");
      }
      return null;
    };

    const loadHierarchy = async () => {
      setLoading(true);
      setError("");
      try {
        let tournamentJson;
        try {
          tournamentJson = await getApi("tournament/read", {
            tournament_id: Number(id) || id,
          });
        } catch {
          tournamentJson = await getApi("tournament", {
            tournament_id: Number(id) || id,
            page: 1,
            limit: 1,
          });
        }
        const tournamentRow = pickTournamentRow(tournamentJson);
        if (mounted && tournamentRow?.status) {
          setTournamentStatus(toStatusLabel(tournamentRow.status));
        }

        const json = await getApi("organizer/hierarchy-read-by-tournament", {
          tournament_id: Number(id) || id,
        });
        const root = normalizeHierarchyResponse(json);
        if (!mounted) return;
        setHierarchyRoot(root);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load hierarchy");
        setHierarchyRoot(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!id) {
      setLoading(false);
      setHierarchyRoot(null);
      setError("Invalid tournament id");
      setTournamentStatus("Unknown");
      return () => {
        mounted = false;
      };
    }

    loadHierarchy();
    return () => {
      mounted = false;
    };
  }, [id, tournamentLabel]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Link
              href="/tournaments"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80 hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </Link>
            <span className="rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/60">
              Hierarchy
            </span>
          </div>

          <h1 className="mt-4 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {tournamentLabel}
          </h1>
          <p className="mt-1 text-slate-600">Organizer hierarchy tree</p>
        </div>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatPill label="Tournament Name" value={tournamentLabel} />
        <StatPill label="Hierarchy Overview" value={hierarchyInfo} />
        <StatPill label="Status" value={tournamentStatus} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Hierarchy</h2>
            <p className="mt-1 text-sm text-slate-600">
              Org-chart view with name, avatar, and role.
            </p>
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">Loading hierarchy...</p>
          ) : error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
          ) : !hierarchyRoot ? (
            <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">No hierarchy found for this tournament.</p>
          ) : (
            <TournamentOrgChart root={hierarchyRoot} />
          )}
        </div>
      </section>
    </main>
  );
}

