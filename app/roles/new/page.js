"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRoles } from "@/contexts/RolesContext";
import { getApi, postApi } from "@/api";

function getNextRoleCode(roles) {
  const numericCodes = roles
    .map((r) => Number(r.roleCode ?? r.role_code))
    .filter((n) => Number.isFinite(n) && n >= 1);
  if (numericCodes.length === 0) return 1;
  return Math.max(...numericCodes) + 1;
}

export default function AddNewRolePage() {
  const router = useRouter();
  const { addRole, roles } = useRoles();
  const [roleName, setRoleName] = useState("");
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

  const moduleKeys = Object.values(modulesBySection).flat();
  const allPermissionChecked =
    moduleKeys.length > 0 && moduleKeys.every((key) => moduleAccess[key] === "FULL");
  const allPermissionIndeterminate =
    !allPermissionChecked && moduleKeys.some((key) => moduleAccess[key] !== "NONE");

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

        setModulesBySection(groupedModules);
        setModuleAccess(
          Object.fromEntries(
            Object.values(groupedModules)
              .flat()
              .filter(Boolean)
              .map((key) => [key, "NONE"])
          )
        );
      } catch (error) {
        setApiError(error?.message || "Failed to load modules.");
      } finally {
        setIsLoadingModules(false);
      }
    };

    loadModules();
  }, []);

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

  const extractCreatedRoleId = (response) => {
    const candidates = [
      response?.id,
      response?.role_id,
      response?.data?.id,
      response?.data?.role_id,
      response?.data?.role?.id,
      response?.data?.role?.role_id,
      Array.isArray(response?.data) ? response.data[0]?.id : undefined,
      Array.isArray(response?.data) ? response.data[0]?.role_id : undefined,
    ];

    const found = candidates.find((value) => value !== undefined && value !== null && `${value}` !== "");
    return found ? String(found) : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setApiError("");

    try {
      const roleResponse = await postApi("role", {
        role_code: getNextRoleCode(roles),
        type: "FULL_ACCESS",
        name: roleName.trim(),
        is_active: 1,
      });

      const createdRoleId = extractCreatedRoleId(roleResponse);
      if (!createdRoleId) {
        throw new Error("Role created but id missing in response.");
      }

      await postApi(`access-module/frontend/role-access/${createdRoleId}`, {
        entries: buildAccessEntries(),
      });

      const enabledKeys = Object.entries(moduleAccess)
        .filter(([, accessLevel]) => accessLevel !== "NONE")
        .map(([key]) => key);

      addRole({
        id: createdRoleId,
        name: roleName.trim(),
        description: description.trim(),
        permissions: enabledKeys,
      });

      router.push(`/roles/${createdRoleId}`);
    } catch (error) {
      setApiError(error?.message || "Failed to create role.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Top: Add New Role + Description */}
      <div className="rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Add New Role</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage data of roles and their permissions.
              </p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Link
                href="/roles"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSaving || isLoadingModules}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Add Role"}
              </button>
            </div>
          </div>
          <div className="mt-6 space-y-4">
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
              <textarea
                id="role-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Enter description"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: All permission details */}
      <div className="rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 overflow-hidden mt-6">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Module Access
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Set access level for each module. Enable &quot;All Permission&quot; to set all modules to FULL.
          </p>
        </div>
        <div className="px-6 py-5 space-y-4 bg-slate-50/40">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5">
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
          </div>

          {isLoadingModules && (
            <p className="text-sm text-slate-500 px-1 py-2">Loading modules...</p>
          )}

          {!isLoadingModules && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
            </div>
          )}

          {!isLoadingModules && moduleKeys.length === 0 && (
            <p className="text-sm text-slate-500 px-1 py-2">No modules found.</p>
          )}

          {apiError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {apiError}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
