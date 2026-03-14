"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { connectSocket, getSocket } from "@/lib/socket";
import { selectUser } from "@/stores/features/auth/authSlice";
import { ordersApi } from "@/stores/features/orders/ordersApi";
import { offlineDetector } from "@/lib/offline/offlineDetector";

interface OrderEventData {
  _id?: string;
  id?: string;
  orderNumber?: string;
  status?: string;
  [key: string]: unknown;
}

interface SocketEventData {
  type: string;
  data: OrderEventData;
  timestamp: Date;
  source?: string;
  meta?: Record<string, unknown>;
}

export function useOrderSocket() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const listInvalidationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    // Only connect socket when online
    if (!offlineDetector.getOnlineStatus()) {
      return;
    }

    // Connect socket
    const socket = connectSocket(user.role, user.id);
    socketRef.current = socket;

    // Update connection status in event handlers
    const updateConnectionStatus = () => {
      setIsConnected(socket.connected);
    };

    // Set initial connection status
    if (socket.connected) {
      updateConnectionStatus();
    }

    socket.on("connect", updateConnectionStatus);
    socket.on("disconnect", updateConnectionStatus);

    const invalidateOrder = (orderId?: string) => {
      if (!orderId) return;
      dispatch(ordersApi.util.invalidateTags([{ type: "Order", id: orderId }]));
    };

    const scheduleCashierListInvalidation = () => {
      if (listInvalidationTimeoutRef.current) {
        clearTimeout(listInvalidationTimeoutRef.current);
      }

      listInvalidationTimeoutRef.current = setTimeout(() => {
        dispatch(
          ordersApi.util.invalidateTags([{ type: "Order", id: "CASHIER_LIST" }]),
        );
        listInvalidationTimeoutRef.current = null;
      }, 800);
    };

    // Listen for new order events (cashier room)
    socket.on("newOrder", (data: SocketEventData) => {
      const orderId = data.data._id || data.data.id;
      invalidateOrder(orderId);
      scheduleCashierListInvalidation();
    });

    // Listen for order updated events
    socket.on("orderUpdated", (data: SocketEventData) => {
      const orderId = data.data._id || data.data.id;
      invalidateOrder(orderId);
    });

    // Listen for order status changed events
    socket.on(
      "order:status:changed",
      (data: {
        type: string;
        data: { orderId: string; orderNumber: string; status: string };
        timestamp: Date;
      }) => {
        invalidateOrder(data.data.orderId);
        scheduleCashierListInvalidation();
      }
    );

    // Listen for order created events (owner-specific)
    socket.on("orderCreated", (data: SocketEventData) => {
      const orderId = data.data._id || data.data.id;
      invalidateOrder(orderId);
      scheduleCashierListInvalidation();
    });

    // Listen for general order events (from orders:general room)
    socket.on("orderEvent", (data: SocketEventData) => {
      // Handle different event types
      if (data.type === "order_created" || data.type === "new_order") {
        const orderId = data.data?._id || data.data?.id;
        invalidateOrder(orderId);
        scheduleCashierListInvalidation();
      } else if (data.type === "order_updated") {
        const orderId = data.data?._id || data.data?.id;
        invalidateOrder(orderId);
      }
    });

    // Cleanup on unmount
    return () => {
      if (listInvalidationTimeoutRef.current) {
        clearTimeout(listInvalidationTimeoutRef.current);
        listInvalidationTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.off("newOrder");
        socketRef.current.off("orderUpdated");
        socketRef.current.off("order:status:changed");
        socketRef.current.off("orderCreated");
        socketRef.current.off("orderEvent");
      }
      // Don't disconnect socket here - it might be used by other components
      // Only disconnect if this is the last component using it
    };
  }, [user, dispatch]);

  return {
    isConnected,
  };
}
