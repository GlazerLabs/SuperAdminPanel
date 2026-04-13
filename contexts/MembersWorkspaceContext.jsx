"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { createOrganizerTeamMember } from "@/api";
import { MEMBERS_ADD_SUCCESS_EVENT } from "@/lib/membersRoleAnalytics";

const MembersWorkspaceContext = createContext(null);

export function MembersWorkspaceProvider({ children }) {
  const submitAddRef = useRef(null);

  const registerAddSubmit = useCallback((fn) => {
    submitAddRef.current = typeof fn === "function" ? fn : null;
    return () => {
      submitAddRef.current = null;
    };
  }, []);

  const submitAdd = useCallback(async (values, options) => {
    const fn = submitAddRef.current;
    if (typeof fn === "function") {
      await fn(values);
      return;
    }

    const rawType = options?.type;
    const type = Number.isFinite(Number(rawType)) ? Number(rawType) : 2;

    await createOrganizerTeamMember({
      username:
        values.username ||
        String(values.email ?? "")
          .split("@")[0]
          .trim() ||
        "user",
      email: values.email,
      mobile: values.mobile ?? "",
      full_name: values.name,
      type,
      profile_pic_url: values.profilePicUrl,
      password: values.password,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(MEMBERS_ADD_SUCCESS_EVENT));
    }
  }, []);

  const value = useMemo(
    () => ({ registerAddSubmit, submitAdd }),
    [registerAddSubmit, submitAdd]
  );

  return (
    <MembersWorkspaceContext.Provider value={value}>
      {children}
    </MembersWorkspaceContext.Provider>
  );
}

export function useMembersWorkspace() {
  const ctx = useContext(MembersWorkspaceContext);
  if (!ctx) {
    throw new Error(
      "useMembersWorkspace must be used within MembersWorkspaceProvider"
    );
  }
  return ctx;
}
