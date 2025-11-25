"use client";

import { useEffect } from "react";
import { useOffline } from "./useOffline";

/**
 * Wrapper hook for RTK Query hooks that automatically serves cached data when offline
 * Shows offline indicators in the UI
 */
export function useOfflineQuery<TData, TError>(
  queryResult: {
    data?: TData;
    error?: TError;
    isLoading: boolean;
    isFetching: boolean;
  },
  options?: {
    showOfflineIndicator?: boolean;
  }
) {
  const { isOffline } = useOffline();
  const showIndicator = options?.showOfflineIndicator ?? true;

  // The actual query hook should handle offline mode via offlineBaseQuery
  // This hook just provides additional offline context if needed

  return {
    ...queryResult,
    isOffline,
    showOfflineIndicator: showIndicator && isOffline,
  };
}

