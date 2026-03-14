"use client";

import axios from "axios";
import { useAuthStore } from "@/zustand/auth";

/**
 * Simple GET request function using axios
 * @param {string} endpoint - API endpoint to call
 * @param {Object} params - Optional query parameters to add to the request
 * @returns {Promise} - Promise that resolves to the response data or rejects with an error
 */
export const getApi = async (endpoint, params = null) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  // Construct URL preserving the protocol
  let url;
  if (baseUrl.startsWith("http")) {
    url = `${baseUrl}/${endpoint}`;
  } else {
    url = `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");
  }

  // Get the token from Zustand store
  const { token } = useAuthStore.getState();

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    // Add Authorization header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Configuration object for axios
    const config = {
      headers,
      withCredentials: true,
      params, // Add query parameters
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
 * Simple POST request function using axios
 * @param {string} endpoint - API endpoint to call
 * @param {Object} data - Data to send in the request body
 * @returns {Promise} - Promise that resolves to the response data or rejects with an error
 */
export const postApi = async (endpoint, data) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  // Construct URL preserving the protocol
  let url;
  if (baseUrl.startsWith("http")) {
    url = `${baseUrl}/${endpoint}`;
  } else {
    url = `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");
  }

  // Get the token from Zustand store
  const { token } = useAuthStore.getState();

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    // Add Authorization header if token exists
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
 * Simple PUT request function using axios
 * @param {string} endpoint - API endpoint to call
 * @param {Object} data - Data to send in the request body
 * @returns {Promise} - Promise that resolves to the response data or rejects with an error
 */
export const putApi = async (endpoint, data) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  // Construct URL preserving the protocol
  let url;
  if (baseUrl.startsWith("http")) {
    url = `${baseUrl}/${endpoint}`;
  } else {
    url = `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");
  }

  // Get the token from Zustand store
  const { token } = useAuthStore.getState();

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    // Add Authorization header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.put(url, data, {
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
 * Simple PATCH request function using axios
 * @param {string} endpoint - API endpoint to call
 * @param {Object} data - Data to send in the request body
 * @returns {Promise} - Promise that resolves to the response data or rejects with an error
 */
export const patchApi = async (endpoint, data) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  // Construct URL preserving the protocol
  let url;
  if (baseUrl.startsWith("http")) {
    url = `${baseUrl}/${endpoint}`;
  } else {
    url = `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");
  }

  // Get the token from Zustand store
  const { token } = useAuthStore.getState();

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    // Add Authorization header if token exists
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
 * Simple DELETE request function using axios
 * @param {string} endpoint - API endpoint to call
 * @param {Object} data - Data to send in the request body
 * @returns {Promise} - Promise that resolves to the response data or rejects with an error
 */
export const deleteApi = async (endpoint, data) => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  // Construct URL preserving the protocol
  let url;
  if (baseUrl.startsWith("http")) {
    url = `${baseUrl}/${endpoint}`;
  } else {
    url = `${baseUrl}/${endpoint}`.replace(/\/+/g, "/").replace(/\/$/, "");
  }

  // Get the token from Zustand store
  const { token } = useAuthStore.getState();

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    // Add Authorization header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.delete(url, {
      headers,
      withCredentials: true,
      data, // For DELETE requests, data goes in the config
    });

    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("API error:", error);
    throw error;
  }
};

/**
 * Fetch user profile data and update Zustand store
 * GET api/v2/profile/read-profile (uses in-built token from auth store)
 * Response: { status, message, data: [ { id, username, email, mobile, full_name, profile_pic_url, organization_name, logo_url, ... } ] }
 * @returns {Promise} - Promise that resolves to the profile data or rejects with an error
 */
export const fetchUserProfile = async () => {
  try {
    const profileData = await getApi("profile/read-profile");

    const { setUserData } = useAuthStore.getState();
    // API returns data as array with single profile object
    const profile = Array.isArray(profileData?.data)
      ? profileData.data[0]
      : profileData?.data ?? profileData;
    setUserData(profile ?? null);

    return profileData;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to fetch user profile:", error);
    throw error;
  }
};

/**
 * Update user profile
 * PUT api/v2/profile/update-profile (uses in-built token from auth store)
 * Body: { username, full_name, email, mobile, bio, date_of_birth, profile_pic_url, image_cover_url, is_account_notification, is_team_invite_notification, is_start_follow_notification, is_tournament_notification, referral_code }
 * @param {Object} data - Profile fields to update
 * @returns {Promise} - Promise that resolves to the response or rejects with an error
 */
export const updateUserProfile = async (data) => {
  try {
    const response = await putApi("profile/update-profile", data);
    const { setUserData } = useAuthStore.getState();
    const raw = response?.data ?? response;
    const profile = Array.isArray(raw) ? raw[0] : raw;
    if (profile && typeof profile === "object") setUserData(profile);
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to update profile:", error);
    throw error;
  }
};

/**
 * Upload image to S3 and get the URL
 * @param {File} file - Image file to upload
 * @returns {Promise} - Promise that resolves to the image URL string
 */
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  let url;
  if (baseUrl.startsWith("http")) {
    url = `${baseUrl}/upload/image`;
  } else {
    url = `${baseUrl}/upload/image`.replace(/\/+/g, "/").replace(/\/$/, "");
  }

  const { token } = useAuthStore.getState();

  try {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(url, formData, {
      headers,
      withCredentials: true,
    });

    // Return the image URL string directly
    return response.data?.url || response.data?.data?.url || response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Image upload error:", error);
    throw error;
  }
};

/**
 * Bulk upload teams via CSV file
 * @param {File} file - CSV file to upload
 * @param {string|number} tournamentId - Tournament ID
 * @returns {Promise} - Promise that resolves to the upload response
 */
export const bulkUploadTeams = async (file, tournamentId) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("tournament_id", tournamentId.toString());

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  let url;
  if (baseUrl.startsWith("http")) {
    url = `${baseUrl}/tournament-registration/bulk-upload`;
  } else {
    url = `${baseUrl}/v2/tournament-registration/bulk-upload`
      .replace(/\/+/g, "/")
      .replace(/\/$/, "");
  }

  const { token } = useAuthStore.getState();

  try {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(url, formData, {
      headers,
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Bulk upload error:", error);
    throw error;
  }
};

/**
 * Bulk upload team members via file (organizer)
 * @param {File} file - File to upload (e.g. CSV/Excel)
 * @returns {Promise} - Promise that resolves to the upload response
 */
export const bulkUploadOrganizerTeam = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  let url;
  if (baseUrl.startsWith("http")) {
    url = `${baseUrl}/organizer/bulk-upload`;
  } else {
    url = `${baseUrl}/organizer/bulk-upload`.replace(/\/+/g, "/").replace(/\/$/, "");
  }

  const { token } = useAuthStore.getState();

  try {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(url, formData, {
      headers,
      withCredentials: true,
    });

    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Organizer bulk upload error:", error);
    throw error;
  }
};

/**
 * Fetch games with eligibility check
 * @param {number} page - Page number
 * @param {number} limit - Number of items per page
 * @returns {Promise} - Promise that resolves to games data
 */
export const fetchGames = async (page = 1, limit = 200) => {
  try {
    const params = { page, limit };
    const response = await getApi("game/check-eligibility", params);
    return response?.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching games:", error);
    throw error;
  }
};

/**
 * Create tournament
 * @param {Object} data - Tournament data
 * @returns {Promise} - Promise that resolves to the created tournament data
 */
export const createTournament = async (data) => {
  try {
    const response = await postApi("tournament", data);
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating tournament:", error);
    throw error;
  }
};

/**
 * Update tournament
 * @param {Object} data - Tournament data
 * @returns {Promise} - Promise that resolves to the updated tournament data
 */
export const updateTournament = async (data) => {
  try {
    const response = await putApi("v2/tournament/organizer-update", data);
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error updating tournament:", error);
    throw error;
  }
};

/**
 * Create stage
 * @param {Object} data - Stage configuration payload
 * @returns {Promise} - Promise that resolves to the created stage data
 */
export const createStage = async (data) => {
  try {
    const response = await postApi("v2/stage/organizer-create", data);
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating stage:", error);
    throw error;
  }
};

/**
 * Create tournament stage (v2)
 * @param {Object} data - Tournament stage payload
 * @returns {Promise} - Promise that resolves to the created tournament stage data
 */
export const createTournamentStage = async (data) => {
  try {
    const response = await postApi("tournament-stage/organizer-create", data);
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating tournament stage:", error);
    throw error;
  }
};

/**
 * Get all tournament stages for a tournament (v2)
 */
export const getTournamentStages = async (tournamentId) => {
  try {
    const params = { tournament_id: tournamentId };
    const response = await getApi("tournament-stage/organizer-get-all", params);
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching tournament stages:", error);
    throw error;
  }
};

// ... Additional helpers trimmed for brevity in this context ...

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

