"use client";

function badgeClasses(type) {
  switch (type) {
    case "user":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100";
    case "organizer":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-100";
    case "team_member":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    case "freelancer":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function typeLabel(type) {
  switch (type) {
    case "user":
      return "User";
    case "organizer":
      return "Organizer";
    case "team_member":
      return "Team member";
    case "freelancer":
      return "Freelancer";
    default:
      return "Node";
  }
}

function NodeRow({ node }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClasses(
          node.type
        )}`}
      >
        {typeLabel(node.type)}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">{node.label}</div>
        {node.meta ? (
          <div className="mt-0.5 text-xs text-slate-500">
            {Object.entries(node.meta)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" • ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TreeBranch({ node, depth = 0 }) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  return (
    <li className="relative">
      <div className="relative rounded-xl bg-white p-3 ring-1 ring-slate-200/80 shadow-sm">
        <NodeRow node={node} />
      </div>

      {hasChildren ? (
        <ul className="mt-3 space-y-3 border-l border-slate-200 pl-4">
          {node.children.map((child) => (
            <li key={child.id} className="relative">
              <span className="absolute -left-4 top-5 h-px w-4 bg-slate-200" aria-hidden />
              <TreeBranch node={child} depth={depth + 1} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function TournamentHierarchyTree({ root }) {
  if (!root) return null;

  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
      <ul className="space-y-3">
        <TreeBranch node={root} />
      </ul>
    </div>
  );
}

