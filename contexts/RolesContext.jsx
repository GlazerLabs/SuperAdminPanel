"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { MOCK_ROLES } from "@/data/rolesMockData";
import { getApi } from "@/api";

const RolesContext = createContext(null);

export function RolesProvider({ children, initialRoles }) {
  const [roles, setRoles] = useState(initialRoles ?? MOCK_ROLES);
  const [rolesMeta, setRolesMeta] = useState(null);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const response = await getApi("role", { page: 1, limit: 100 });
        const nestedData = Array.isArray(response?.data) ? response.data[0] : null;
        const rawRoles = Array.isArray(nestedData?.data)
          ? nestedData.data
          : Array.isArray(response?.data)
            ? response.data
          : Array.isArray(response)
            ? response
            : Array.isArray(response?.roles)
              ? response.roles
              : [];

        const userCounts =
          nestedData?.userCounts && typeof nestedData.userCounts === "object"
            ? nestedData.userCounts
            : null;
        const totalFromApi =
          typeof nestedData?.total === "number" ? nestedData.total : rawRoles.length;

        setRolesMeta({
          total: totalFromApi,
          userCounts,
          totalUsers: typeof userCounts?.totalUsers === "number" ? userCounts.totalUsers : null,
        });

        const normalizeRole = (role) => {
          const nameKey = String(role?.name ?? role?.role_name ?? "")
            .trim()
            .toLowerCase();
          const countFromUserCounts =
            userCounts && nameKey && typeof userCounts[nameKey] === "number"
              ? userCounts[nameKey]
              : undefined;

          return {
            id: String(role?.id ?? role?.role_id ?? role?.role_code ?? Date.now()),
            name: role?.name ?? role?.role_name ?? "Untitled Role",
            description: role?.description ?? role?.type ?? "",
            permissions: Array.isArray(role?.permissions) ? role.permissions : [],
            memberCount:
              role?.memberCount ??
              role?.member_count ??
              countFromUserCounts ??
              0,
            roleCode: role?.role_code,
            type: role?.type,
            isActive: role?.is_active,
          };
        };

        if (rawRoles.length > 0) {
          setRoles(rawRoles.map(normalizeRole));
        } else {
          setRoles([]);
        }
      } catch (_error) {
        // Keep existing roles (mock/optimistic) if API call fails.
      }
    };

    loadRoles();
  }, []);

  const addRole = useCallback((role) => {
    const id = String(role?.id ?? Date.now());
    setRoles((prev) => [...prev, { ...role, id, memberCount: role.memberCount ?? 0 }]);
    setRolesMeta((prev) =>
      prev && typeof prev.total === "number" ? { ...prev, total: prev.total + 1 } : prev
    );
    return id;
  }, []);

  const updateRole = useCallback((id, updates) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  const removeRole = useCallback((id) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    setRolesMeta((prev) =>
      prev && typeof prev.total === "number" && prev.total > 0
        ? { ...prev, total: prev.total - 1 }
        : prev
    );
  }, []);

  const getRoleById = useCallback(
    (id) => roles.find((r) => r.id === id) ?? null,
    [roles]
  );

  return (
    <RolesContext.Provider
      value={{
        roles,
        setRoles,
        rolesMeta,
        addRole,
        updateRole,
        removeRole,
        getRoleById,
      }}
    >
      {children}
    </RolesContext.Provider>
  );
}

export function useRoles() {
  const ctx = useContext(RolesContext);
  if (!ctx) throw new Error("useRoles must be used within RolesProvider");
  return ctx;
}
