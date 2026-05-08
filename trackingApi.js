"use client";

import axios from "axios";
import { useAuthStore } from "@/zustand/auth";

const buildTrackingUrl = (endpoint) => {
  const baseUrl = process.env.NEXT_PUBLIC_TRACKING_BASE_URL || "";
  return baseUrl.startsWith("http")
    ? `${baseUrl}/${endpoint}`
    : `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");
};

export const getTrackingApi = async (endpoint, params = null) => {
  const url = buildTrackingUrl(endpoint);
  const { token } = useAuthStore.getState();

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await axios.get(url, {
      headers,
      withCredentials: true,
      params,
    });
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Tracking API error:", error.response?.data || error);
    throw error.response?.data || error;
  }
};
