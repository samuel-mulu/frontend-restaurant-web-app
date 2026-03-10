"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiConfig } from "@/config/apiConfig";
import { cn } from "@/lib/utils";
import {
  selectIsAuthenticated,
  selectUser,
} from "@/stores/features/auth/authSlice";
import { AlertCircle, Bell, Check } from "lucide-react";
import { useCallback, useState } from "react";
import { useSelector } from "react-redux";

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
  const [notifications, setNotifications] = useState<TableNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newNotificationIds, setNewNotificationIds] = useState<Set<string>>(
    new Set(),
  );

  // Get user authentication state
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userRole = user?.role;

  // Only allow notifications for cashier and owner roles
  const shouldShowNotifications =
    isAuthenticated && (userRole === "cashier" || userRole === "owner");

  const fetchActiveNotifications = useCallback(async () => {
    // Don't fetch if user is not authenticated or doesn't have the right role
    if (!shouldShowNotifications) {
      return;
    }

    try {
      const response = await fetch(`${apiConfig.BASE_URL}/table-notifications`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {

          // Track new notifications for animation
          const currentIds = new Set(
            result.data.map((n: TableNotification) => n._id),
          );
          const previousIds = new Set(
            notifications.map((n: TableNotification) => n._id),
          );

          // Find new notifications
          const currentIdArray = Array.from(currentIds) as string[];
          const newIds: Set<string> = new Set(
            currentIdArray.filter((id: string) => !previousIds.has(id)),
          );

          if (newIds.size > 0) {
            setNewNotificationIds(newIds);
            // Clear animation after 3 seconds
            setTimeout(() => {
              setNewNotificationIds(new Set<string>());
            }, 3000);
          }

          setNotifications(result.data);
        } else {
          console.warn(
            "[NotificationBell] API returned success:false",
            result.message,
          );
        }
      } else {
        console.error(
          `[NotificationBell] HTTP Error: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error("[NotificationBell] Network/Fetch failed:", error);
    }
  }, [shouldShowNotifications, user?.name, userRole, notifications]);

  const clearNotification = async (id: string) => {
    try {
      const response = await fetch(
        `${apiConfig.BASE_URL}/table-notifications/${id}/clear`,
        {
          method: "PATCH",
        },
      );
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }
    } catch (error) {
      console.error("Failed to clear notification:", error);
    }
  };

  const pendingCount = notifications.length;

  const handleOpenModal = () => {
    // Clear animation when opening modal
    setNewNotificationIds(new Set<string>());
    setIsOpen(true);
  };

  const handleManualRefresh = async () => {
    // Manual refresh button to fetch notifications
    await fetchActiveNotifications();
  };

  // Don't render notification bell for users without proper role
  if (!shouldShowNotifications) {
    return null;
  }

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpenModal}
          className={cn(
            "rounded-full h-9 w-9 bg-card/80 border border-border shadow-sm backdrop-blur relative",
            newNotificationIds.size > 0 && "animate-pulse",
          )}
        >
          <Bell
            className={cn(
              "h-5 w-5 text-muted-foreground transition-colors",
              newNotificationIds.size > 0 && "text-red-500",
            )}
          />

          {/* Animated red ring effect */}
          {newNotificationIds.size > 0 && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping" />
              <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-pulse" />
            </>
          )}

          {/* Notification count badge */}
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                "absolute -top-1 -right-1 px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center text-[10px] font-bold border-2 border-background",
                newNotificationIds.size > 0 && "animate-bounce",
              )}
            >
              {pendingCount}
            </Badge>
          )}
        </Button>

        {/* Manual refresh button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleManualRefresh}
          className="rounded-full h-7 w-7 bg-card/80 border border-border shadow-sm backdrop-blur ml-1"
          title="Refresh notifications"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <span>Table Notifications</span>
              </div>
              <Badge variant="secondary">{pendingCount} Active</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <Bell className="h-10 w-10 mb-2" />
                <p className="text-sm font-medium">No active calls</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Table calls will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={cn(
                      "p-4 rounded-xl border transition-all hover:shadow-md",
                      newNotificationIds.has(notification._id)
                        ? "bg-orange-50/50 border-orange-200 animate-pulse"
                        : "bg-muted/50 border-border/50",
                    )}
                  >
                    {/* Table Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-100 text-orange-600 rounded-lg p-2">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-lg text-orange-600">
                            Table {notification.tableNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(
                              notification.createdAt,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
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

                    {/* Products Section */}
                    {notification.metadata?.items &&
                      notification.metadata.items.length > 0 && (
                        <div className="bg-white/50 rounded-lg p-3 border border-orange-100">
                          <p className="text-xs font-semibold text-orange-600 mb-2 uppercase tracking-wide">
                            Requested Items
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {notification.metadata.items.map((item, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs py-1 px-2 bg-orange-50 text-orange-700 border-orange-200 font-medium"
                              >
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Status indicator for new notifications */}
                    {newNotificationIds.has(notification._id) && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                        <span className="font-medium">New call</span>
                      </div>
                    )}
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
  );
}
