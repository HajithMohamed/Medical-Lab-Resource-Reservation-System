export const SOCKET_EVENTS = {
  BOOKING_CREATED: "booking:created",
  BOOKING_CANCELLED: "booking:cancelled",
  SLOT_UPDATE: "slot:update",
} as const;

export type SocketEventType = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
