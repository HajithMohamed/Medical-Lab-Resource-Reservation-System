"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@/lib/socket-events";

/**
 * Hook to listen for real-time booking updates via socket.io.
 * When a booking is created or cancelled by any client,
 * it calls onUpdate (or defaults to router.refresh()).
 */
export function useBookingSocket(onUpdate?: () => void) {
  const router = useRouter();

  React.useEffect(() => {
    let socket: Socket | null = null;

    try {
      // Connect to the socket.io endpoint
      socket = io({
        path: "/api/socket/io",
        autoConnect: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
      });

      const handleUpdate = () => {
        if (onUpdate) {
          onUpdate();
        } else {
          router.refresh();
        }
      };

      socket.on(SOCKET_EVENTS.BOOKING_CREATED, handleUpdate);
      socket.on(SOCKET_EVENTS.BOOKING_CANCELLED, handleUpdate);
      socket.on(SOCKET_EVENTS.SLOT_UPDATE, handleUpdate);
    } catch {
      // Socket fallback - gracefully handle offline/disconnected state
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [onUpdate, router]);
}
