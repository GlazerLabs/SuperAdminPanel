"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { getApi, putApi } from "@/api";

const extractAccessEntries = (response) => {
  const payload = Array.isArray(response?.data) ? response.data[0] : response?.data ?? response;
  if (Array.isArray(payload?.entries)) return payload.entries;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.role_access)) return payload.role_access;
  if (Array.isArray(payload?.user_access)) return payload.user_access;
  if (Array.isArray(payload?.access)) return payload.access;
  if (Array.isArray(response?.entries)) return response.entries;
  return [];
};

const mapFrontendModulesToAccess = (response, defaultAccess) => {
  const payload = Array.isArray(response?.data) ? response.data[0] : response?.data ?? response;
  const modules = payload?.frontend_modules;
  if (!modules || typeof modules !== "object" || Array.isArray(modules)) return false;

  Object.entries(modules).forEach(([moduleKey, actions]) => {
    if (!(moduleKey in defaultAccess)) return;

    const canCreate = Boolean(actions?.create);
    const canRead = Boolean(actions?.read);
    const canUpdate = Boolean(actions?.update);
    const canDelete = Boolean(actions?.delete);

    if (canCreate && canRead && canUpdate && canDelete) {
      defaultAccess[moduleKey] = "FULL";
      return;
    }

    if (canCreate || canRead || canUpdate || canDelete) {
      defaultAccess[moduleKey] = "VIEW";
      return;
    }

    defaultAccess[moduleKey] = "NONE";
  });

  return true;
};

const normalizeAccessLevel = (level) => {
  const s = String(level ?? "").trim().toLowerCase();
  if (s === "full") return "FULL";
  if (s === "view" || s === "read") return "VIEW";
  if (s === "none") return "NONE";
  const u = String(level ?? "").trim().toUpperCase();
  if (u === "FULL") return "FULL";
  if (u === "VIEW" || u === "READ") return "VIEW";
  if (u === "NONE") return "NONE";
  return "NONE";
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

const permissionsForUiLevel = (level) => {
  if (level === "FULL") return { create: true, read: true, update: true, delete: true };
  if (level === "VIEW") return { create: false, read: true, update: false, delete: false };
  return { create: false, read: false, update: false, delete: false };
};

const buildUserAccessPayload = (moduleAccess) => ({
  entries: Object.entries(moduleAccess).map(([module_key, level]) => ({
    module_key,
    access_level: level === "FULL" ? "full" : level === "VIEW" ? "view" : "none",
    permissions: permissionsForUiLevel(level),
  })),
});

function MemberAccessPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = params?.userId != null ? String(params.userId) : "";
  const displayName = searchParams?.get("name")?.trim() || "";

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
      if (!userId) return;
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

        const accessResponse = await getApi("access-module/frontend/user-access", {
          user_id: userId,
        });
        const didMapFrontendModules = mapFrontendModulesToAccess(accessResponse, defaultAccess);
        const accessEntries = extractAccessEntries(accessResponse);

        if (!didMapFrontendModules && accessEntries.length > 0) {
          accessEntries.forEach((entry) => {
            const level = normalizeAccessLevel(entry?.access_level);
            if (entry?.module_key && entry.module_key in defaultAccess) {
              defaultAccess[entry.module_key] = level;
            }
            if (Array.isArray(entry?.module_keys)) {
              entry.module_keys.forEach((moduleKey) => {
                if (moduleKey in defaultAccess) defaultAccess[moduleKey] = level;
              });
            }
          });
        }

        setModulesBySection(groupedModules);
        setModuleAccess(defaultAccess);
      } catch (error) {
        const msg =
          error?.response?.data?.message ??
          error?.message ??
          (typeof error === "string" ? error : null) ??
          "Failed to load modules.";
        setApiError(String(msg));
      } finally {
        setIsLoadingModules(false);
      }
    };

    loadModules();
  }, [userId]);

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

  const handleSave = async () => {
    if (!userId || isSaving) return;
    setIsSaving(true);
    setApiError("");

    try {
      await putApi(
        `access-module/frontend/user-access/${userId}`,
        buildUserAccessPayload(moduleAccess)
      );
    } catch (error) {
      const msg =
        error?.response?.data?.message ??
        error?.message ??
        (typeof error === "string" ? error : null) ??
        "Failed to update user access.";
      setApiError(String(msg));
    } finally {
      setIsSaving(false);
    }
  };

  if (!userId) {
    router.replace("/members/users");
    return null;
  }

  const enabledCount = Object.values(moduleAccess).filter((level) => level !== "NONE").length;

  return (
    <>
      <div className="rounded-2xl bg-white shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 overflow-hidden">
        <div className="px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold text-slate-900">Member module access</h1>
              <p className="text-sm text-slate-600">
                {displayName ? (
                  <>
                    <span className="font-semibold text-slate-900">{displayName}</span>
                    <span className="text-slate-400"> · </span>
                  </>
                ) : null}
                User ID <span className="font-mono text-slate-800">{userId}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

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
              <li className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
                <p className="text-sm text-slate-500">No modules found.</p>
              </li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}

export default function MemberAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl bg-white p-12 text-center shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      }
    >
      <MemberAccessPageInner />
    </Suspense>
  );
}
