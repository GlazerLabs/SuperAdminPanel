"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useRoles } from "@/contexts/RolesContext";
import { getApi, putApi } from "@/api";

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const { getRoleById, updateRole, removeRole } = useRoles();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modulesBySection, setModulesBySection] = useState({
    super_admin: [],
    oap: [],
    admin: [],
  });
  const [moduleAccess, setModuleAccess] = useState({});
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const allCheckRef = useRef(null);

  const role = id ? getRoleById(id) : null;
  const moduleKeys = Object.values(modulesBySection).flat();
  const allPermissionChecked =
    moduleKeys.length > 0 && moduleKeys.every((key) => moduleAccess[key] === "FULL");
  const allPermissionIndeterminate =
    !allPermissionChecked && moduleKeys.some((key) => moduleAccess[key] !== "NONE");

  useEffect(() => {
    if (role) {
      setName(role.name ?? "");
      setDescription(role.description ?? "");
    }
  }, [role]);

  useEffect(() => {
    if (allCheckRef.current) allCheckRef.current.indeterminate = allPermissionIndeterminate;
  }, [allPermissionIndeterminate]);

  useEffect(() => {
    const loadModules = async () => {
      setIsLoadingModules(true);
      setApiError("");
      try {
        const response = await getApi("access-module/frontend/modules");
        const payload = Array.isArray(response?.data) ? response.data[0] : {};
        const groupedModules = {
          super_admin: Array.isArray(payload?.super_admin) ? payload.super_admin : [],
          oap: Array.isArray(payload?.oap) ? payload.oap : [],
          admin: Array.isArray(payload?.admin) ? payload.admin : [],
        };

        const defaultAccess = Object.fromEntries(
          Object.values(groupedModules)
            .flat()
            .filter(Boolean)
            .map((key) => [key, "NONE"])
        );

        (role?.permissions || []).forEach((key) => {
          if (key in defaultAccess) defaultAccess[key] = "FULL";
        });

        setModulesBySection(groupedModules);
        setModuleAccess(defaultAccess);
      } catch (error) {
        setApiError(error?.message || "Failed to load modules.");
      } finally {
        setIsLoadingModules(false);
      }
    };

    if (role) loadModules();
  }, [role]);

  const handleAllPermissionChange = (checked) => {
    const nextValue = checked ? "FULL" : "NONE";
    setModuleAccess((prev) => {
      const next = { ...prev };
      moduleKeys.forEach((key) => {
        next[key] = nextValue;
      });
      return next;
    });
  };

  const handleModuleAccessChange = (key, accessLevel) => {
    setModuleAccess((prev) => ({ ...prev, [key]: accessLevel }));
  };

  const isSectionAllChecked = (sectionKey) => {
    const keys = modulesBySection[sectionKey] || [];
    return keys.length > 0 && keys.every((key) => moduleAccess[key] === "FULL");
  };

  const handleSectionAllPermissionChange = (sectionKey, checked) => {
    const keys = modulesBySection[sectionKey] || [];
    const nextValue = checked ? "FULL" : "NONE";
    setModuleAccess((prev) => {
      const next = { ...prev };
      keys.forEach((key) => {
        next[key] = nextValue;
      });
      return next;
    });
  };

  const formatModuleLabel = (moduleKey, sectionKey) => {
    const prefix =
      sectionKey === "super_admin" ? "super_" : sectionKey === "oap" ? "oap_" : "admin_";
    const cleaned = moduleKey.startsWith(prefix) ? moduleKey.slice(prefix.length) : moduleKey;
    return cleaned
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const buildAccessEntries = () => {
    const grouped = { VIEW: [], FULL: [], NONE: [] };
    Object.entries(moduleAccess).forEach(([key, accessLevel]) => {
      if (!grouped[accessLevel]) return;
      grouped[accessLevel].push(key);
    });

    return Object.entries(grouped).flatMap(([accessLevel, keys]) => {
      if (keys.length === 0) return [];
      if (keys.length === 1) return [{ module_key: keys[0], access_level: accessLevel }];
      return [{ module_keys: keys, access_level: accessLevel }];
    });
  };

  const handleSave = async () => {
    if (!id || isSaving) return;
    setIsSaving(true);
    setApiError("");

    const enabledKeys = Object.entries(moduleAccess)
      .filter(([, accessLevel]) => accessLevel !== "NONE")
      .map(([key]) => key);

    try {
      await putApi(`access-module/frontend/role-access/${id}`, {
        entries: buildAccessEntries(),
      });
      updateRole(id, { name: name.trim(), description: description.trim(), permissions: enabledKeys });
    } catch (error) {
      setApiError(error?.message || "Failed to update role access.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    removeRole(id);
    setDeleteConfirm(false);
    router.push("/roles");
  };

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

  const enabledCount = Object.values(moduleAccess).filter((level) => level !== "NONE").length;

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
              Module Access ({enabledCount} enabled)
            </h3>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoadingModules}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
          {apiError && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {apiError}
            </div>
          )}
          <ul className="space-y-4">
            <li className="flex items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-indigo-900">All Permission</p>
                <p className="text-xs text-indigo-700/80 mt-0.5">Set every module to FULL access.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center shrink-0">
                <input
                  type="checkbox"
                  checked={allPermissionChecked}
                  ref={allCheckRef}
                  onChange={(e) => handleAllPermissionChange(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-indigo-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-indigo-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-indigo-500/20 peer-focus:ring-offset-2" />
              </label>
            </li>
            {isLoadingModules && (
              <li className="px-1 py-2 text-sm text-slate-500">Loading modules...</li>
            )}
            {!isLoadingModules && (
              <li className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {[
                  { key: "oap", title: "OAP" },
                  { key: "admin", title: "Admin Panel" },
                  { key: "super_admin", title: "Super Admin" },
                ].map((section) => (
                  <div key={section.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800">{section.title}</h4>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {(modulesBySection[section.key] || []).length} modules
                      </span>
                    </div>
                    <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-700">All Permission ({section.title})</p>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={isSectionAllChecked(section.key)}
                          onChange={(e) => handleSectionAllPermissionChange(section.key, e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="peer h-5 w-10 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-5" />
                      </label>
                    </div>
                    <div className="space-y-2">
                      {(modulesBySection[section.key] || []).map((key) => (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {formatModuleLabel(key, section.key)}
                            </p>
                          </div>
                          <select
                            value={moduleAccess[key] || "NONE"}
                            onChange={(e) => handleModuleAccessChange(key, e.target.value)}
                            className="min-w-[100px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold tracking-wide text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="NONE">NONE</option>
                            <option value="VIEW">VIEW</option>
                            <option value="FULL">FULL</option>
                          </select>
                        </div>
                      ))}
                      {(modulesBySection[section.key] || []).length === 0 && (
                        <p className="px-1 py-1 text-sm text-slate-400">No modules.</p>
                      )}
                    </div>
                  </div>
                ))}
              </li>
            )}
            {!isLoadingModules && moduleKeys.length === 0 && (
              <li
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"
              >
                <p className="text-sm text-slate-500">No modules found.</p>
              </li>
            )}
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
