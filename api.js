"use client";

import axios from "axios";
import { useAuthStore } from "@/zustand/auth";

/**
 * Simple GET request function using axios.
 * Pass only the endpoint and optional query params.
 */
export const getApi = async (endpoint, params = null) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  const url = baseUrl.startsWith("http")
    ? `${baseUrl}/${endpoint}`
    : `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");

  const { token } = useAuthStore.getState();

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config = {
      headers,
      withCredentials: true,
      params,
    };

    const response = await axios.get(url, config);
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("API error:", error);
    throw error;
  }
};

/**
 * Simple POST request function using axios.
 * Pass only the endpoint and body data.
 */
export const postApi = async (endpoint, data) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const url = baseUrl.startsWith("http")
    ? `${baseUrl}/${endpoint}`
    : `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");

  const { token } = useAuthStore.getState();

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(url, data, {
      headers,
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error.response?.data);
    // eslint-disable-next-line no-console
    console.error("API error:", error.response?.data || error);
    throw error.response?.data || error;
  }
};

/**
 * Simple PATCH request function using axios.
 * Pass only the endpoint and body data.
 */
export const patchApi = async (endpoint, data) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const url = baseUrl.startsWith("http")
    ? `${baseUrl}/${endpoint}`
    : `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");

  const { token } = useAuthStore.getState();

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.patch(url, data, {
      headers,
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("API error:", error);
    throw error;
  }
};

/**
 * Fetch user type counts for dashboard stats.
 * Uses a service token from env instead of the auth store token.
 */
export const fetchUserTypeCounts = async (type = "super_admin") => {
  try {
    const response = await getApi("profile/user-type-counts", { type });
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to fetch user type counts:", error);
    throw error;
  }
};

/**
 * Fetch dashboard user counts:
 * - totalUsers (overall)
 * - users (within selected date range)
 */
export const fetchDashboardUserCounts = async (startDate, endDate) => {
  try {
    const response = await getApi("super-admin/get-user-counts", {
      startDate,
      endDate,
    });
    return response;
  } catch (error) {
    console.error("Failed to fetch dashboard user counts:", error);
    throw error;
  }
};

/**
 * Read current logged-in admin profile.
 * Tries `GET profile/read-profile` first, then falls back to `POST` with token in body.
 */
export const readProfile = async () => {
  const { token } = useAuthStore.getState();
  if (!token) throw new Error("Not authenticated: missing token");

  const normalizeProfileResponse = (resp) => {
    // Your backend response looks like:
    // { status: 1, message: "success", data: [ { ...profileFields } ] }
    if (Array.isArray(resp?.data)) {
      return resp.data[0] ?? null;
    }

    // Other possible shapes (defensive)
    return (
      resp?.profile ??
      resp?.data?.profile ??
      resp?.data?.user ??
      resp?.user ??
      resp?.data ??
      null
    );
  };

  try {
    const res = await getApi("profile/read-profile");
    return normalizeProfileResponse(res);
  } catch (getErr) {
    // Some backends may require POST; include token in body as requested.
    const res = await postApi("profile/read-profile", { token });
    return normalizeProfileResponse(res);
  }
};

/**
 * Logout helper that also clears auth store and redirects.
 */
export const logout = () => {
  const { logout: logoutAction } = useAuthStore.getState();
  logoutAction();
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
};


