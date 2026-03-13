"use client";

import { useState, useEffect, useRef } from "react";
import { PERMISSIONS } from "@/data/rolesMockData";

export default function AddEditRoleModal({
  open,
  title = "Add New Role",
  subtitle = "Manage roles and their permissions.",
  initialValues = null,
  onClose,
  onSubmit,
}) {
  const isEdit = Boolean(initialValues);
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState(() =>
    Object.fromEntries(PERMISSIONS.map((p) => [p.key, false]))
  );

  useEffect(() => {
    if (open) {
      if (initialValues) {
        setRoleName(initialValues.name ?? "");
        setDescription(initialValues.description ?? "");
        const perms = { ...Object.fromEntries(PERMISSIONS.map((p) => [p.key, false])) };
        (initialValues.permissions || []).forEach((key) => {
          if (key in perms) perms[key] = true;
        });
        setPermissions(perms);
      } else {
        setRoleName("");
        setDescription("");
        setPermissions(Object.fromEntries(PERMISSIONS.map((p) => [p.key, false])));
      }
    }
  }, [open, initialValues]);

  const handleAllPermissionChange = (checked) => {
    const next = { ...permissions };
    PERMISSIONS.forEach((p) => (next[p.key] = checked));
    setPermissions(next);
  };

  const handlePermissionChange = (key, checked) => {
    setPermissions((prev) => ({ ...prev, [key]: checked }));
  };

  const allCheckRef = useRef(null);
  const allPermissionChecked = permissions.all === true;
  const allPermissionIndeterminate =
    !allPermissionChecked && PERMISSIONS.some((p) => p.key !== "all" && permissions[p.key]);

  useEffect(() => {
    if (allCheckRef.current) allCheckRef.current.indeterminate = allPermissionIndeterminate;
  }, [allPermissionIndeterminate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const enabledKeys = PERMISSIONS.filter((p) => permissions[p.key]).map((p) => p.key);
    onSubmit({
      name: roleName.trim(),
      description: description.trim(),
      permissions: enabledKeys,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-modal-title"
        className="relative w-full max-w-lg rounded-2xl bg-white p-0 shadow-xl ring-1 ring-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <h2 id="role-modal-title" className="text-xl font-semibold text-slate-900">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto">
          {/* Role Details */}
          <div className="border-b border-slate-200 px-6 py-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Role Details
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="role-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Role Name
                </label>
                <input
                  id="role-name"
                  type="text"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter role name"
                />
              </div>
              <div>
                <label htmlFor="role-desc" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <input
                  id="role-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter description"
                />
              </div>
            </div>
          </div>

          {/* Permission */}
          <div className="px-6 py-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Permission
            </h3>
            <div className="space-y-1">
              {PERMISSIONS.map((perm) => (
                <div
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
                    <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-indigo-500/20 peer-focus:ring-offset-2 peer-indeterminate:bg-indigo-400" />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              {isEdit ? "Save Changes" : "Add Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
