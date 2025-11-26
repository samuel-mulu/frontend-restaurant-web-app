import { io, Socket } from "socket.io-client";
import { apiConfig } from "@/config/apiConfig";

// Extract base URL without /api/v1 for Socket.IO
const getSocketUrl = (): string => {
  const baseUrl = apiConfig.BASE_URL.replace("/api/v1", "");
  return baseUrl;
};

let socket: Socket | null = null;

export const connectSocket = (userRole?: string, userId?: string): Socket => {
  // Disconnect existing socket if any
  if (socket?.connected) {
    socket.disconnect();
  }

  const socketUrl = getSocketUrl();

  socket = io(socketUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    if (!socket) return;
    
    console.log("🔌 Socket.IO connected:", socket.id);

    // Join role-based rooms
    if (userRole === "owner") {
      socket.emit("join-owner");
      socket.emit("join-owner-orders");
    } else if (userRole === "cashier") {
      socket.emit("join-cashier");
    } else if (userRole === "waiter" && userId) {
      socket.emit("join-waiter", userId);
    }

    // Also subscribe to general order events
    socket.emit("subscribe-orders");
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket.IO disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("🔌 Socket.IO connection error:", error);
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log("🔌 Socket.IO reconnected after", attemptNumber, "attempts");

    // Rejoin rooms after reconnection
    if (userRole === "owner") {
      socket?.emit("join-owner");
      socket?.emit("join-owner-orders");
    } else if (userRole === "cashier") {
      socket?.emit("join-cashier");
    } else if (userRole === "waiter" && userId) {
      socket?.emit("join-waiter", userId);
    }
    socket?.emit("subscribe-orders");
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const isSocketConnected = (): boolean => {
  return socket?.connected ?? false;
};
