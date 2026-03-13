"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { MOCK_ROLES } from "@/data/rolesMockData";

const RolesContext = createContext(null);

export function RolesProvider({ children, initialRoles }) {
  const [roles, setRoles] = useState(initialRoles ?? MOCK_ROLES);

  const addRole = useCallback((role) => {
    const id = String(Date.now());
    setRoles((prev) => [...prev, { ...role, id, memberCount: role.memberCount ?? 0 }]);
    return id;
  }, []);

  const updateRole = useCallback((id, updates) => {
    setRoles((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  const removeRole = useCallback((id) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const getRoleById = useCallback(
    (id) => roles.find((r) => r.id === id) ?? null,
    [roles]
  );

  return (
    <RolesContext.Provider
      value={{ roles, setRoles, addRole, updateRole, removeRole, getRoleById }}
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
