"use client";

import { useRouter } from "next/navigation";
import { useRoles } from "@/contexts/RolesContext";
import { PERMISSIONS } from "@/data/rolesMockData";

export default function RolesTable() {
  const router = useRouter();
  const { roles } = useRoles();
  const permKeysToLabel = Object.fromEntries(PERMISSIONS.map((p) => [p.key, p.label]));

  if (roles.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
        <p className="text-slate-500">No roles yet. Click &quot;Add New&quot; to create your first role.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Role Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Description
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Permissions
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roles.map((role) => (
              <tr
                key={role.id}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-900">{role.name}</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                  {role.description || "—"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {(role.permissions || []).slice(0, 4).map((key) => (
                      <span
                        key={key}
                        className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                      >
                        {permKeysToLabel[key] ?? key}
                      </span>
                    ))}
                    {(role.permissions || []).length > 4 && (
                      <span className="text-xs text-slate-400">
                        +{(role.permissions || []).length - 4} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => router.push(`/roles/${role.id}`)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
