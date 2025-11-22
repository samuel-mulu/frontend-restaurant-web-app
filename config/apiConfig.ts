/**
 * API Configuration
 *
 * Centralized configuration for API base URL and other API-related settings.
 * Uses environment variables with fallback to default development URL.
 */

export const apiConfig = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1",
} as const;
