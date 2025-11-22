/**
 * API Configuration
 *
 * This file contains the base configuration for making API requests.
 * It provides a reusable fetch wrapper that handles:
 * - Base URL configuration
 * - Error handling
 * - Response parsing
 * - Common headers
 */

// Get the API base URL from environment variables
// NEXT_PUBLIC_ prefix is required for Next.js to expose this to the browser
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

/**
 * API Error class for better error handling
 */
export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Standard API Response format from backend
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

/**
 * Fetch wrapper for API requests
 *
 * This function:
 * 1. Constructs the full URL
 * 2. Adds common headers (Content-Type, etc.)
 * 3. Handles request body serialization
 * 4. Parses JSON responses
 * 5. Handles errors consistently
 *
 * @param endpoint - API endpoint (e.g., "/categories")
 * @param options - Fetch options (method, body, etc.)
 * @returns Promise with parsed response data
 * @throws ApiError if request fails
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Construct full URL
  const url = `${API_BASE_URL}${endpoint}`;

  // Default headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // If body is FormData, let the browser set Content-Type
  if (options.body instanceof FormData) {
    delete (headers as any)["Content-Type"];
  }

  // Prepare request configuration
  const config: RequestInit = {
    ...options,
    headers,
    // Convert body to JSON string if it's an object, unless it's FormData
    body:
      options.body && typeof options.body === "object" && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  };

  try {
    // Make the request
    const response = await fetch(url, config);

    // Parse JSON response
    const data: ApiResponse<T> = await response.json();

    // Handle error responses
    if (!response.ok || !data.success) {
      throw new ApiError(
        response.status,
        data.message || `Request failed with status ${response.status}`,
        data.code
      );
    }

    // Return the data (backend wraps it in { success: true, data: ... })
    return data.data as T;
  } catch (error) {
    // Handle network errors or JSON parsing errors
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new ApiError(
        0,
        "Network error: Could not connect to the server. Please check if the backend is running.",
        "NETWORK_ERROR"
      );
    }

    // Unknown error
    throw new ApiError(
      500,
      error instanceof Error ? error.message : "An unexpected error occurred",
      "UNKNOWN_ERROR"
    );
  }
}

/**
 * Helper functions for common HTTP methods
 */
export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }),

  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: "POST", body }),

  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, { method: "PATCH", body }),

  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "DELETE" }),

  // FormData helpers
  postFormData: <T>(endpoint: string, body: FormData) =>
    apiRequest<T>(endpoint, { method: "POST", body }),

  patchFormData: <T>(endpoint: string, body: FormData) =>
    apiRequest<T>(endpoint, { method: "PATCH", body }),
};
