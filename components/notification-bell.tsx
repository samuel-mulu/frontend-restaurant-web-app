"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Bell, X, Check } from "lucide-react"
import { useAppSelector } from "@/stores/hooks"
import { selectAccessToken } from "@/stores/features/auth/authSlice"
import { apiConfig } from "@/config/apiConfig"
import { getSocket } from "@/lib/socket"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface TableNotification {
  _id: string;
  tableNumber: number;
  status: "pending" | "cleared";
  metadata?: {
    items?: string[];
  };
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<TableNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const token = useAppSelector(selectAccessToken)

  const fetchActiveNotifications = useCallback(async () => {
    if (!token) {
      console.log("[NotificationBell] Missing access token, skipping fetch");
      return;
    }
    
    try {
      console.log("[NotificationBell] Polling table notifications...");
      const response = await fetch(`${apiConfig.BASE_URL}/table-notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          console.log(`[NotificationBell] Successfully fetched ${result.data.length} active notifications`);
          setNotifications(result.data)
        } else {
          console.warn("[NotificationBell] API returned success:false", result.message);
        }
      } else {
        console.error(`[NotificationBell] HTTP Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("[NotificationBell] Network/Fetch failed:", error)
    }
  }, [token])

  const clearNotification = async (id: string) => {
    if (!token) return
    try {
      const response = await fetch(`${apiConfig.BASE_URL}/table-notifications/${id}/clear`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n._id !== id))
      }
    } catch (error) {
      console.error("Failed to clear notification:", error)
    }
  }

  const pathname = usePathname()

  useEffect(() => {
    // Initial fetch
    fetchActiveNotifications()

    // Add polling every 5 seconds for free plan efficiency
    // Only poll when on the search/order page to save resources
    const pollInterval = setInterval(() => {
      // Only fetch if the tab is active and we are on the relevant page
      if (document.visibilityState === "visible" && pathname === "/create-order") {
        fetchActiveNotifications()
      }
    }, 5000)

    return () => {
      clearInterval(pollInterval)
    }
  }, [fetchActiveNotifications, pathname])

  const pendingCount = notifications.length

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="rounded-full h-9 w-9 bg-card/80 border border-border shadow-sm backdrop-blur"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {pendingCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center text-[10px] font-bold border-2 border-background animate-in fade-in zoom-in duration-300"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Table Notifications</span>
              <Badge variant="secondary">{pendingCount} Active</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <Bell className="h-10 w-10 mb-2" />
                <p className="text-sm font-medium">No active calls</p>
              </div>
            ) : (
              <div className="space-y-3 pt-4">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-bold text-lg">Table {notification.tableNumber}</p>
                      {notification.metadata?.items && notification.metadata.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 mb-2">
                          {notification.metadata.items.map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-[9px] py-0 px-1 bg-blue-50/50 text-blue-600 border-blue-200">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => clearNotification(notification._id)}
                      className="bg-green-500 hover:bg-green-600 text-white h-8 px-3 rounded-lg flex items-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Clear
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="pt-4 border-t border-border mt-auto">
              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-semibold">
                Notifications clear automatically after 20 mins
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
