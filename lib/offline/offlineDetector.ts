/**
 * Offline Detection Service
 * Detects online/offline state using navigator.onLine and network events
 * Falls back to API polling if navigator.onLine is unreliable
 */

type OnlineStatusListener = (isOnline: boolean) => void;

class OfflineDetector {
  private isOnline: boolean;
  private listeners: Set<OnlineStatusListener> = new Set();
  private pollInterval: NodeJS.Timeout | null = null;
  private lastKnownOnline: Date | null = null;
  private apiUrl: string;

  constructor() {
    this.isOnline = navigator.onLine;
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

    // Listen to browser online/offline events
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);

      // Start polling if navigator.onLine is unreliable
      // Poll every 30 seconds when offline, every 60 seconds when online
      this.startPolling();
    }
  }

  private handleOnline = () => {
    this.setOnlineStatus(true);
  };

  private handleOffline = () => {
    this.setOnlineStatus(false);
  };

  private setOnlineStatus(status: boolean) {
    if (this.isOnline !== status) {
      this.isOnline = status;
      if (status) {
        this.lastKnownOnline = new Date();
      }
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.isOnline));
  }

  /**
   * Poll API endpoint to check connectivity
   * This is a fallback for cases where navigator.onLine is unreliable
   */
  private async checkConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      // Try auth/profile endpoint as health check (requires auth but lightweight)
      // If it fails with network error, we're offline
      const response = await fetch(`${this.apiUrl}/auth/profile`, {
        method: "GET",
        signal: controller.signal,
        cache: "no-cache",
        credentials: "include",
      });

      clearTimeout(timeoutId);
      // Even 401 means we're online (just not authenticated)
      // Only network errors mean offline
      return true; // If we got any response, we're online
    } catch (error: any) {
      // Network error means offline
      if (error.name === "AbortError" || error.message?.includes("fetch")) {
        return false;
      }
      return true; // Other errors mean we're online but request failed
    }
  }

  /**
   * Start polling for connectivity
   */
  private startPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    const pollInterval = this.isOnline ? 60000 : 30000; // 60s online, 30s offline

    this.pollInterval = setInterval(async () => {
      const isConnected = await this.checkConnectivity();
      this.setOnlineStatus(isConnected);
    }, pollInterval);
  }

  /**
   * Get current online status
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Get last known online timestamp
   */
  getLastKnownOnline(): Date | null {
    return this.lastKnownOnline;
  }

  /**
   * Subscribe to online status changes
   */
  subscribe(listener: OnlineStatusListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current status
    listener(this.isOnline);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Manually check connectivity
   */
  async checkNow(): Promise<boolean> {
    const isConnected = await this.checkConnectivity();
    this.setOnlineStatus(isConnected);
    return isConnected;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const offlineDetector = new OfflineDetector();

