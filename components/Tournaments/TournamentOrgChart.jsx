"use client";

import OrgChartNode from "@/components/Tournaments/OrgChartNode";

function toChartNode(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    label: raw.label,
    type: raw.type,
    role:
      raw.type === "user"
        ? "User"
        : raw.type === "organizer"
          ? "Organizer"
          : raw.type === "team_member"
            ? "Team member"
            : raw.type === "freelancer"
              ? "Freelancer"
              : "Member",
    meta: raw.meta ?? null,
    children: Array.isArray(raw.children) ? raw.children.map(toChartNode).filter(Boolean) : [],
  };
}

function Branch({ node }) {
  if (!node) return null;

  return (
    <li>
      <OrgChartNode node={node} />
      {node.children?.length ? (
        <ul>
          {node.children.map((c) => (
            <Branch key={c.id} node={c} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function TournamentOrgChart({ root }) {
  const node = toChartNode(root);
  if (!node) return null;

  return (
    <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200/80">
      <div className="org-chart org-chart--prominent overflow-x-auto">
        <ul>
          <Branch node={node} />
        </ul>
      </div>
    </div>
  );
}

