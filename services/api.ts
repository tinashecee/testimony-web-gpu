import { cacheService, CACHE_KEYS } from "./cacheService";

// Use Next.js API proxy to avoid CORS issues
// The proxy forwards to: https://testimonyapi.soxfort.com (production) or http://142.93.56.4:5000 (development)
const API_BASE_URL = "http://41.220.20.218:5000";

// Configuration for API requests
const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Helper function to create a fetch request with timeout
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout = API_CONFIG.timeout
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
};

// Helper function to retry API calls
const retryFetch = async (
  url: string,
  options: RequestInit = {},
  maxRetries = API_CONFIG.retryAttempts
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`API request attempt ${attempt}/${maxRetries} to ${url}`);
      const response = await fetchWithTimeout(url, options);

      // If we get a response, return it (even if it's an error status)
      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(`API request attempt ${attempt} failed:`, error);

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying (with exponential backoff)
      const delay = API_CONFIG.retryDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(
    `API request failed after ${maxRetries} attempts. Last error: ${
      lastError?.message || "Unknown error"
    }`
  );
};

// Helper function to get the token from cookies
const getToken = () => {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1];
};

// Helper function to get headers with authorization
const getAuthHeaders = (contentType = "application/json") => {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": contentType,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

export interface Recording {
  id: number;
  case_number: string;
  title: string;
  notes: string;
  annotations: Annotation[];
  date_stamp: string;
  judge_name: string;
  prosecution_counsel: string;
  defense_counsel: string;
  court: string; // Court name (e.g., "High Court Harare")
  courtroom: string; // Courtroom name (e.g., "Courtroom 1")
  transcript: string;
  duration: string;
  size: string;
  status: string;
  file_path: string;
  assigned_to?: string; // Assigned user for transcript processing
  transcript_status?: string; // Status of transcript processing
}

export interface Annotation {
  id: string;
  party: string;
  text: string;
  timestamp: string;
}

export interface TranscriptionAssignment {
  id: number;
  date_assigned: string;
  user_id: number;
  user_name: string;
  user_email: string;
  case_id: number;
  case_number: string;
  case_title: string;
}

export interface TranscriptComment {
  id: number;
  created_at: string;
  comment_type: string;
  comment_text: string;
  commenter_id: number;
  commenter_name: string;
  commenter_email: string;
  case_id: number;
  case_number: string;
  case_title: string;
}

export interface Court {
  court_id: number;
  court_name: string;
  address?: string;
  contact_info?: string;
  province?: string;
  district?: string;
  region?: string; // auto from province; for Mashonaland East choose one
  created_at?: string;
}

export interface Courtroom {
  court_id: number;
  courtroom_id: number;
  courtroom_name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role:
    | "super_admin"
    | "admin"
    | "court_recorder"
    | "registrar"
    | "judge"
    | "station_magistrate"
    | "resident_magistrate"
    | "provincial_magistrate"
    | "regional_magistrate"
    | "senior_regional_magistrate"
    | "clerk_of_court"
    | "transcriber"
    | "recording_supervisor";
  court: string; // Court associated with the user
  contact_info: string; // Contact information
  // Optional location fields (role-based requirements in UI)
  province?: string;
  district?: string;
  region?: string;
  date_created?: string; // Optional, can be set to the current date
}

export interface LoginResponse {
  token: string;
  message?: string;
  user?: User & { id: number };
}

export interface CurrentUser extends User {
  id: number;
}

export interface SubscriptionData {
  court_id: string;
  allowed_courtrooms: string;
  start_date: string;
  expiration_date: string;
}

export const recordingsApi = {
  uploadFile: async (
    file: File,
    targetFilename: string
  ): Promise<{ filename: string }> => {
    const form = new FormData();
    form.append("file", file, targetFilename);

    console.log("[API] POST (direct) /upload starting", {
      name: file.name,
      sendAs: targetFilename,
      size: file.size,
      type: file.type,
    });
    const startedAt = Date.now();
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        "[API] /upload failed",
        response.status,
        response.statusText,
        text
      );
      throw new Error(
        `Upload failed: ${response.status} ${response.statusText} ${text}`
      );
    }
    const elapsedMs = Date.now() - startedAt;
    console.log("[API] (direct) /upload response", {
      status: response.status,
      statusText: response.statusText,
      elapsedMs,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    });
    const json = await response.json().catch(async () => {
      const t = await response.text().catch(() => "");
      console.warn("[API] (direct) /upload non-JSON body", t?.slice(0, 200));
      return { filename: "" } as any;
    });
    console.log("[API] (direct) /upload success", json);
    // Expecting { message, filename }
    return { filename: json.filename };
  },

  uploadRecording: async (meta: Record<string, string>): Promise<void> => {
    // Direct form-encoded call (server reads request.form)
    const body = new URLSearchParams();
    Object.entries(meta).forEach(([k, v]) => {
      if (v !== undefined && v !== null) body.append(k, String(v));
    });

    console.log(
      "[API] POST (direct) /upload_recording starting",
      Object.fromEntries(body)
    );
    const startedAtMeta = Date.now();
    const response = await fetch(`${API_BASE_URL}/upload_recording`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        "[API] /upload_recording failed",
        response.status,
        response.statusText,
        text
      );
      throw new Error(
        `Failed to save recording: ${response.status} ${response.statusText} ${text}`
      );
    }
    const elapsedMsMeta = Date.now() - startedAtMeta;
    console.log("[API] (direct) /upload_recording response", {
      status: response.status,
      statusText: response.statusText,
      elapsedMs: elapsedMsMeta,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    });
    const metaJson = await response
      .json()
      .catch(async () => ({ text: await response.text().catch(() => "") }));
    console.log("[API] (direct) /upload_recording success", metaJson);
  },
  getAllRecordings: async (forceRefresh = false): Promise<Recording[]> => {
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cachedData = cacheService.get<Recording[]>(CACHE_KEYS.RECORDINGS);
      if (cachedData) {
        console.log("📦 Serving recordings from cache");
        return cachedData;
      }
    }

    try {
      console.log("🌐 Fetching recordings from API...");
      // Use the correct recordings endpoint
      const response = await retryFetch(`${API_BASE_URL}/recordings`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch recordings: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();

      // Cache the data for 5 minutes
      cacheService.set(CACHE_KEYS.RECORDINGS, data, 5 * 60 * 1000);
      console.log("💾 Recordings cached successfully");

      return data;
    } catch (error) {
      console.error("Error in getAllRecordings:", error);
      throw error;
    }
  },

  getRecording: async (id: number): Promise<Recording> => {
    // Check cache first
    const cacheKey = CACHE_KEYS.RECORDING(id);
    const cachedData = cacheService.get<Recording>(cacheKey);
    if (cachedData) {
      console.log(`📦 Serving recording ${id} from cache`);
      return cachedData;
    }

    console.log(`🌐 Fetching recording ${id} from API...`);
    const response = await fetch(`${API_BASE_URL}/recordings/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch recording");
    }
    const data = await response.json();

    // Cache individual recording for 10 minutes
    cacheService.set(cacheKey, data, 10 * 60 * 1000);
    console.log(`💾 Recording ${id} cached successfully`);

    return data;
  },

  getAudioUrl: (recordingId: number): string => {
    return `${API_BASE_URL}/download_audio/${recordingId}`;
  },

  updateRecording: async (
    id: number,
    data: Partial<Recording>
  ): Promise<void> => {
    const formData = new FormData();

    if (data.annotations) {
      formData.append("annotations", JSON.stringify(data.annotations));
    }

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== "annotations") {
        formData.append(key, value.toString());
      }
    });
    console.log(formData);
    const response = await fetch(`${API_BASE_URL}/update_recording/${id}`, {
      method: "PUT",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to update recording");
    }

    // Invalidate cache for this recording and the recordings list
    cacheService.delete(CACHE_KEYS.RECORDING(id));
    cacheService.delete(CACHE_KEYS.RECORDINGS);
    console.log(`🗑️ Cache invalidated for recording ${id} and recordings list`);
  },

  // Paginated recordings with full fields and filters
  getRecordingsPaginated: async (params: {
    limit?: number;
    offset?: number;
    q?: string;
    court?: string;
    courtroom?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    region?: string;
    district?: string;
    province?: string;
    sort_by?: "date_stamp" | "case_number" | "title";
    sort_dir?: "asc" | "desc";
  }): Promise<{
    items: Recording[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  }> => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "")
        search.append(k, String(v));
    });
    const url = `${API_BASE_URL}/recordings_paginated?${search.toString()}`;
    const response = await retryFetch(url, { headers: getAuthHeaders() });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch paginated recordings: ${response.status} ${response.statusText}`
      );
    }
    return await response.json();
  },

  getCourts: async (): Promise<Court[]> => {
    // Check cache first
    const cachedData = cacheService.get<Court[]>(CACHE_KEYS.COURTS);
    if (cachedData) {
      console.log("📦 Serving courts from cache");
      return cachedData;
    }

    try {
      console.log("🌐 Fetching courts from API...");
      const response = await retryFetch(`${API_BASE_URL}/courts`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch courts: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();

      // Cache courts for 15 minutes (they change less frequently)
      cacheService.set(CACHE_KEYS.COURTS, data, 15 * 60 * 1000);
      console.log("💾 Courts cached successfully");

      return data;
    } catch (error) {
      console.error("Error in getCourts:", error);
      throw error;
    }
  },

  getCourtrooms: async (): Promise<Courtroom[]> => {
    // Check cache first
    const cachedData = cacheService.get<Courtroom[]>(CACHE_KEYS.COURTROOMS);
    if (cachedData) {
      console.log("📦 Serving courtrooms from cache");
      return cachedData;
    }

    try {
      console.log("🌐 Fetching courtrooms from API...");
      const response = await retryFetch(`${API_BASE_URL}/courtrooms`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch courtrooms: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();

      // Cache courtrooms for 15 minutes (they change less frequently)
      cacheService.set(CACHE_KEYS.COURTROOMS, data, 15 * 60 * 1000);
      console.log("💾 Courtrooms cached successfully");

      return data;
    } catch (error) {
      console.error("Error in getCourtrooms:", error);
      throw error;
    }
  },

  addCourtroom: async (
    courtroom: Omit<Courtroom, "courtroom_id">
  ): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/add_courtroom`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(courtroom),
    });
    if (!response.ok) {
      throw new Error("Failed to add courtroom");
    }
  },

  deleteCourtroom: async (courtroomId: number): Promise<void> => {
    const response = await fetch(
      `${API_BASE_URL}/delete_courtrooms/${courtroomId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok) {
      throw new Error("Failed to delete courtroom");
    }
  },

  addCourt: async (court: Omit<Court, "court_id">): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/add_court`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(court),
    });
    if (!response.ok) {
      throw new Error("Failed to add court");
    }
  },

  deleteCourt: async (court_id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/delete_court/${court_id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error("Failed to delete court");
    }
  },

  addUser: async (user: Omit<User, "date_created">): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/add_user`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...user, date_created: new Date().toISOString() }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to add user:", response.status, errorText);
      
      // Check for duplicate email error
      if (errorText.includes("Duplicate entry") && errorText.includes("email")) {
        throw new Error(`A user with email "${user.email}" already exists. Please use a different email address.`);
      }
      
      throw new Error(`Failed to add user: ${response.status} - ${errorText}`);
    }

    // Invalidate users cache
    cacheService.delete(CACHE_KEYS.USERS);
    console.log("🗑️ Users cache invalidated after adding user");
  },

  getUsers: async (): Promise<User[]> => {
    // Check cache first
    const cachedData = cacheService.get<User[]>(CACHE_KEYS.USERS);
    if (cachedData) {
      console.log("📦 Serving users from cache");
      return cachedData;
    }

    try {
      console.log("🌐 Fetching users from API...");
      const response = await retryFetch(`${API_BASE_URL}/users`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch users: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();

      // Cache users for 10 minutes
      cacheService.set(CACHE_KEYS.USERS, data, 10 * 60 * 1000);
      console.log("💾 Users cached successfully");

      return data;
    } catch (error) {
      console.error("Error in getUsers:", error);
      throw error;
    }
  },

  editUser: async (
    user: Omit<User, "date_created"> & { id: number }
  ): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/edit_user/${user.id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(user),
    });
    if (!response.ok) {
      throw new Error("Failed to update user");
    }
  },

  deleteUser: async (userId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/delete_user/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to delete user");
    }
  },

  // Recordings by geography helpers
  getRecordingsByRegion: async (region: string): Promise<Recording[]> => {
    const cacheKey = CACHE_KEYS.RECORDINGS_BY_REGION(region);
    const cached = cacheService.get<Recording[]>(cacheKey);
    if (cached) {
      console.log(`📦 Serving recordings by region '${region}' from cache`);
      return cached;
    }
    const response = await retryFetch(
      `${API_BASE_URL}/recordings/by_region/${encodeURIComponent(region)}`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch recordings by region: ${response.status}`
      );
    }
    const data = await response.json();
    cacheService.set(cacheKey, data, 5 * 60 * 1000);
    return data;
  },

  getRecordingsByDistrict: async (district: string): Promise<Recording[]> => {
    const cacheKey = CACHE_KEYS.RECORDINGS_BY_DISTRICT(district);
    const cached = cacheService.get<Recording[]>(cacheKey);
    if (cached) {
      console.log(`📦 Serving recordings by district '${district}' from cache`);
      return cached;
    }
    const response = await retryFetch(
      `${API_BASE_URL}/recordings/by_district/${encodeURIComponent(district)}`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch recordings by district: ${response.status}`
      );
    }
    const data = await response.json();
    cacheService.set(cacheKey, data, 5 * 60 * 1000);
    return data;
  },

  getRecordingsByCourt: async (courtName: string): Promise<Recording[]> => {
    const response = await retryFetch(
      `${API_BASE_URL}/recordings/by_court/${encodeURIComponent(courtName)}`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch recordings by court: ${response.status}`
      );
    }
    return await response.json();
  },

  // Province helper: try direct endpoint first; fallback to courts aggregation
  getRecordingsByProvince: async (province: string): Promise<Recording[]> => {
    const cacheKey = CACHE_KEYS.RECORDINGS_BY_PROVINCE(province);
    const cached = cacheService.get<Recording[]>(cacheKey);
    if (cached) {
      console.log(`📦 Serving recordings by province '${province}' from cache`);
      return cached;
    }
    // Try direct backend endpoint if available
    try {
      const direct = await retryFetch(
        `${API_BASE_URL}/recordings/by_province/${encodeURIComponent(province)}`
      );
      if (direct.ok) {
        const data = await direct.json();
        cacheService.set(cacheKey, data, 5 * 60 * 1000);
        return data;
      }
    } catch (e) {
      // fall through to aggregation
    }

    // Fallback: fetch courts and filter by province, then aggregate by court
    const courtsResponse = await retryFetch(`${API_BASE_URL}/courts`);
    if (!courtsResponse.ok) {
      throw new Error(`Failed to fetch courts: ${courtsResponse.status}`);
    }
    const courts: Court[] = await courtsResponse.json();
    const provinceCourts = (courts || []).filter(
      (c: any) => (c.province || "").toLowerCase() === province.toLowerCase()
    );

    const all: Recording[] = [];
    for (const court of provinceCourts) {
      try {
        const byCourt = await recordingsApi.getRecordingsByCourt(
          (court as any).court_name || court.court_name
        );
        all.push(...byCourt);
      } catch (e) {
        console.warn(
          "Failed fetching recordings for court",
          court.court_name,
          e
        );
      }
    }
    cacheService.set(cacheKey, all, 5 * 60 * 1000);
    return all;
  },

  addRecording: async (data: FormData): Promise<void> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/add_recording`, {
      method: "POST",
      headers,
      body: data,
    });

    if (!response.ok) {
      throw new Error("Failed to add recording");
    }
  },

  loginUser: async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to login");
    }

    // Set auth token cookie. Use Secure only on HTTPS to ensure the cookie is accepted in local dev.
    try {
      const isHttps =
        typeof window !== "undefined" && window.location.protocol === "https:";
      const cookieParts = [
        `token=${data.token}`,
        "path=/",
        // Lax is safer for typical flows and avoids strict cross-site issues
        "samesite=lax",
        // Keep users signed in for a reasonable period (e.g., 7 days). Adjust as needed.
        "max-age=604800",
      ];
      if (isHttps) {
        cookieParts.push("secure");
      }
      document.cookie = cookieParts.join("; ");
    } catch (e) {
      console.warn("Failed to set auth cookie:", e);
    }

    return data;
  },

  // Login for web frontend using /login_web
  loginWebUser: async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/login_web`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to login");
    }

    // Set auth token cookie (mirror loginUser behavior)
    try {
      const isHttps =
        typeof window !== "undefined" && window.location.protocol === "https:";
      const cookieParts = [
        `token=${data.token}`,
        "path=/",
        "samesite=lax",
        "max-age=604800",
      ];
      if (isHttps) {
        cookieParts.push("secure");
      }
      document.cookie = cookieParts.join("; ");
    } catch (e) {
      console.warn("Failed to set auth cookie:", e);
    }

    return data;
  },

  // Fetch current user using /me
  getCurrentUser: async (): Promise<CurrentUser> => {
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        data.message || `Failed to get current user: ${response.status}`
      );
    }
    const data = await response.json();
    return data as CurrentUser;
  },

  logoutUser: async (): Promise<void> => {
    try {
      const token = getToken();

      // If no token, just clear the cookie
      if (!token) {
        document.cookie =
          "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict";
        return;
      }

      const response = await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        // Treat 401/403/404 as successful logout since the session is effectively ended
        if (
          response.status !== 401 &&
          response.status !== 403 &&
          response.status !== 404
        ) {
          throw new Error("Logout failed");
        }
      }

      // Clear the token cookie (attempt both with and without Secure to cover both envs)
      document.cookie =
        "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
      document.cookie =
        "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax; secure";
    } catch (error) {
      // Still clear the cookie even if the request fails, and do not rethrow to avoid noisy UI errors
      document.cookie =
        "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
      document.cookie =
        "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax; secure";
      return;
    }
  },

  getCurrentUser: async (): Promise<CurrentUser> => {
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    if (!response.ok) {
      let message = `Failed to get current user: ${response.status}`;
      try {
        const data = await response.json();
        if (data?.message) message = data.message;
      } catch {}
      throw new Error(message);
    }
    return (await response.json()) as CurrentUser;
  },

  generateSubscription: async (
    subscriptionData: SubscriptionData
  ): Promise<void> => {
    console.log("🔍 API: Generating subscription with data:", subscriptionData);

    // The backend expects form data, not JSON
    const formData = new FormData();
    formData.append("court_id", subscriptionData.court_id);
    formData.append("allowed_courtrooms", subscriptionData.allowed_courtrooms);
    formData.append("start_date", subscriptionData.start_date);
    formData.append("expiration_date", subscriptionData.expiration_date);

    console.log("🔍 API: Sending form data:", Object.fromEntries(formData));

    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/generate_subscription`, {
      method: "POST",
      headers,
      body: formData,
    });

    console.log("🔍 API: Response status:", response.status);

    if (!response.ok) {
      let errorMessage = `Failed to generate subscription (${response.status})`;
      try {
        const errorData = await response.text(); // Try text first since it might not be JSON
        console.log("🔍 API: Error response:", errorData);
        errorMessage = errorData || errorMessage;
      } catch (e) {
        console.log("🔍 API: Could not parse error response");
      }
      throw new Error(errorMessage);
    }

    try {
      return await response.json();
    } catch (e) {
      // Some endpoints might return empty or text response
      console.log("🔍 API: Non-JSON response, assuming success");
      return;
    }
  },

  // Cache management utilities
  invalidateRecordingsCache: (): void => {
    cacheService.delete(CACHE_KEYS.RECORDINGS);
    console.log("🗑️ Recordings cache invalidated");
  },

  refreshRecordings: async (): Promise<Recording[]> => {
    // Force refresh by bypassing cache
    return await recordingsApi.getAllRecordings(true);
  },
};

// Transcription Assignment API
export const transcriptionApi = {
  // Get all transcription assignments
  getAssignments: async (): Promise<TranscriptionAssignment[]> => {
    try {
      const response = await retryFetch(`${API_BASE_URL}/transcription_users`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch assignments: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Error in getAssignments:", error);
      throw error;
    }
  },

  // Get assignments for a specific case
  getAssignmentsByCase: async (
    caseId: number
  ): Promise<TranscriptionAssignment[]> => {
    try {
      // Try the specific case endpoint first
      const response = await retryFetch(
        `${API_BASE_URL}/transcription_users/${caseId}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (response.ok) {
        return await response.json();
      } else if (response.status === 404) {
        // If specific endpoint doesn't exist, fall back to filtering all assignments
        console.log(
          "Specific case endpoint not found, falling back to filtering all assignments"
        );
        const assignments = await transcriptionApi.getAssignments();
        return assignments.filter(
          (assignment) => assignment.case_id === caseId
        );
      } else {
        throw new Error(
          `Failed to fetch assignments for case: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error in getAssignmentsByCase:", error);
      throw error;
    }
  },

  // Add a new assignment
  addAssignment: async (
    caseId: number,
    userId: number
  ): Promise<{ message: string; id: number }> => {
    try {
      const response = await retryFetch(
        `${API_BASE_URL}/add_transcription_user`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            case_id: caseId,
            user_id: userId,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to add assignment: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Error in addAssignment:", error);
      throw error;
    }
  },

  // Update an assignment
  updateAssignment: async (
    id: number,
    caseId: number,
    userId: number
  ): Promise<{ message: string }> => {
    try {
      const response = await retryFetch(
        `${API_BASE_URL}/transcription_users/${id}`,
        {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            case_id: caseId,
            user_id: userId,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to update assignment: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Error in updateAssignment:", error);
      throw error;
    }
  },

  // Delete an assignment
  deleteAssignment: async (id: number): Promise<{ message: string }> => {
    try {
      const response = await retryFetch(
        `${API_BASE_URL}/transcription_users/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to delete assignment: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Error in deleteAssignment:", error);
      throw error;
    }
  },
};

// Transcript Comments API
export const commentsApi = {
  // Get comments for a specific case
  getComments: async (caseId: number): Promise<TranscriptComment[]> => {
    try {
      const response = await retryFetch(
        `${API_BASE_URL}/transcript_comments/${caseId}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to fetch comments: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Error in getComments:", error);
      throw error;
    }
  },

  // Add a new comment
  addComment: async (
    caseId: number,
    commenterId: number,
    commentType: string,
    commentText: string
  ): Promise<{ message: string; id: number }> => {
    try {
      const response = await retryFetch(
        `${API_BASE_URL}/add_transcription_comment`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            case_id: caseId,
            commenter: commenterId,
            comment_type: commentType,
            comment_text: commentText,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to add comment: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Error in addComment:", error);
      throw error;
    }
  },

  // Update a comment
  updateComment: async (
    id: number,
    commentType: string,
    commentText: string
  ): Promise<{ message: string }> => {
    try {
      const response = await retryFetch(
        `${API_BASE_URL}/transcript_comments/${id}`,
        {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            comment_type: commentType,
            comment_text: commentText,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to update comment: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Error in updateComment:", error);
      throw error;
    }
  },

  // Delete a comment
  deleteComment: async (id: number): Promise<{ message: string }> => {
    try {
      const response = await retryFetch(
        `${API_BASE_URL}/transcript_comments/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to delete comment: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Error in deleteComment:", error);
      throw error;
    }
  },

  // Cache management utilities
  clearCache: (): void => {
    cacheService.clear();
    console.log("🗑️ All cache cleared");
  },

  getCacheStats: () => {
    return cacheService.getStats();
  },
};

// Users API
type UserType = {
  id: number;
  name: string;
  email: string;
  role: string;
  date_created?: string;
};

export const usersApi = {
  // Get all users
  getUsers: async (): Promise<UserType[]> => {
    try {
      const response = await retryFetch(`${API_BASE_URL}/users`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch users: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Error in getUsers:", error);
      throw error;
    }
  },
};
