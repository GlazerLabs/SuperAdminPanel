"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useRoles } from "@/contexts/RolesContext";
import { PERMISSIONS } from "@/data/rolesMockData";

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const { getRoleById, updateRole, removeRole } = useRoles();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState(() =>
    Object.fromEntries(PERMISSIONS.map((p) => [p.key, false]))
  );
  const allCheckRef = useRef(null);

  const role = id ? getRoleById(id) : null;

  useEffect(() => {
    if (role) {
      setName(role.name ?? "");
      setDescription(role.description ?? "");
      const perms = Object.fromEntries(PERMISSIONS.map((p) => [p.key, false]));
      (role.permissions || []).forEach((key) => {
        if (key in perms) perms[key] = true;
      });
      setPermissions(perms);
    }
  }, [role]);

  if (!id) {
    router.replace("/roles");
    return null;
  }

  if (!role) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
        <p className="text-slate-500">Role not found.</p>
        <button
          type="button"
          onClick={() => router.push("/roles")}
          className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          Back to All Roles
        </button>
      </div>
    );
  }

  const allPermissionChecked = permissions.all === true;
  const allPermissionIndeterminate =
    !allPermissionChecked && PERMISSIONS.some((p) => p.key !== "all" && permissions[p.key]);

  useEffect(() => {
    if (allCheckRef.current) allCheckRef.current.indeterminate = allPermissionIndeterminate;
  }, [allPermissionIndeterminate]);

  const handleAllPermissionChange = (checked) => {
    const next = { ...permissions };
    PERMISSIONS.forEach((p) => (next[p.key] = checked));
    setPermissions(next);
  };

  const handlePermissionChange = (key, checked) => {
    setPermissions((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSave = () => {
    const enabledKeys = PERMISSIONS.filter((p) => permissions[p.key]).map((p) => p.key);
    updateRole(id, { name: name.trim(), description: description.trim(), permissions: enabledKeys });
  };

  const handleDelete = () => {
    removeRole(id);
    setDeleteConfirm(false);
    router.push("/roles");
  };

  const enabledCount = PERMISSIONS.filter((p) => permissions[p.key]).length;

  return (
    <>
      {/* Role card: name + description editable (same as Add), Delete only */}
      <div className="role-detail-enter rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 overflow-hidden">
        <div className="px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Role name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Role name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Description"
                />
              </div>
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-indigo-600">{role.memberCount ?? 0}</span> members
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors shrink-0"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* All permissions with toggles: open = has permission, closed = doesn't. Edit same way as Add. */}
      <div className="role-detail-perms-enter mt-6 rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Permissions ({enabledCount} enabled)
            </h3>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Save changes
            </button>
          </div>
          <ul className="space-y-2">
            {PERMISSIONS.map((perm) => (
              <li
                key={perm.key}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{perm.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{perm.description}</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center shrink-0">
                  <input
                    type="checkbox"
                    checked={perm.key === "all" ? allPermissionChecked : permissions[perm.key]}
                    ref={perm.key === "all" ? allCheckRef : undefined}
                    onChange={(e) =>
                      perm.key === "all"
                        ? handleAllPermissionChange(e.target.checked)
                        : handlePermissionChange(perm.key, e.target.checked)
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-indigo-500/20 peer-focus:ring-offset-2" />
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Delete role?</h3>
            <p className="mt-2 text-sm text-slate-500">
              &quot;{role.name}&quot; will be removed. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
