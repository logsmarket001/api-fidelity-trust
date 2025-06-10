// import { create } from "zustand";
// import { io, Socket } from "socket.io-client";
// import { useRouter } from "next/navigation";

// export interface Notification {
//   id: string;
//   type: "chat" | "transaction";
//   content: string;
//   data: {
//     userId: string;
//     transactionId?: string;
//     isAdmin?: boolean;
//     type?: string;
//     action?: "credit" | "debit";
//     amount?: number;
//     status?: string;
//   };
//   timestamp: Date;
//   read: boolean;
// }

// interface NotificationStore {
//   notifications: Notification[];
//   unreadCount: number;
//   socket: Socket | null;
//   isConnected: boolean;
//   initializeSocket: () => void;
//   disconnectSocket: () => void;
//   markAsRead: (notificationId: string) => void;
//   markAllAsRead: () => void;
//   deleteNotification: (notificationId: string) => void;
//   deleteAllNotifications: () => void;
//   handleNotificationClick: (notification: Notification) => void;
// }

// export const useNotificationStore = create<NotificationStore>((set, get) => ({
//   notifications: [],
//   unreadCount: 0,
//   socket: null,
//   isConnected: false,

//   initializeSocket: () => {
//     console.log("[Notifications] Initializing socket connection...");
//     const socket = io(
//       `${
//         process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"
//       }/user-notifications`,
//       {
//         withCredentials: true,
//         transports: ["websocket"],
//         autoConnect: true,
//       }
//     );

//     socket.on("connect", () => {
//       console.log("[Notifications] Socket connected successfully", {
//         id: socket.id,
//         connected: socket.connected,
//       });
//       set({ isConnected: true });

//       const userId = sessionStorage.getItem("user-id");
//       if (userId) {
//         const roomName = `user_${userId}`;
//         console.log("[Notifications] Joining room:", roomName);
//         socket.emit(
//           "join",
//           roomName,
//           (response: { success: boolean; room: string }) => {
//             if (response.success) {
//               console.log(
//                 "[Notifications] Successfully joined room:",
//                 response.room
//               );
//             } else {
//               console.error("[Notifications] Failed to join room:", response);
//             }
//           }
//         );
//       }
//     });

//     // Handle room join acknowledgment separately from notifications
//     socket.on("joined_room", (data: { room: string }) => {
//       console.log("[Notifications] Successfully joined room:", data.room);
//     });

//     // Only handle actual notifications
//     socket.on("notification", (notification: Notification) => {
//       console.log("[Notifications] Received notification:", notification);
//       // Only process if it's a valid notification with required fields
//       if (notification.type && notification.content && notification.data) {
//         set((state) => ({
//           notifications: [
//             {
//               ...notification,
//               timestamp: new Date(),
//               read: false,
//             },
//             ...state.notifications,
//           ],
//           unreadCount: state.unreadCount + 1,
//         }));
//       }
//     });

//     socket.on("disconnect", () => {
//       console.log("[Notifications] Socket disconnected");
//       set({ isConnected: false });
//     });

//     set({ socket });
//   },

//   disconnectSocket: () => {
//     const { socket } = get();
//     if (socket) {
//       socket.disconnect();
//       set({ socket: null, isConnected: false });
//     }
//   },

//   markAsRead: (notificationId: string) => {
//     console.log(
//       "[Notifications] Marking notification as read:",
//       notificationId
//     );
//     set((state) => ({
//       notifications: state.notifications.map((n) =>
//         n.id === notificationId ? { ...n, read: true } : n
//       ),
//       unreadCount: Math.max(0, state.unreadCount - 1),
//     }));
//   },

//   markAllAsRead: () => {
//     console.log("[Notifications] Marking all notifications as read");
//     set((state) => ({
//       notifications: state.notifications.map((n) => ({ ...n, read: true })),
//       unreadCount: 0,
//     }));
//   },

//   deleteNotification: (notificationId: string) => {
//     console.log("[Notifications] Deleting notification:", notificationId);
//     set((state) => ({
//       notifications: state.notifications.filter((n) => n.id !== notificationId),
//       unreadCount: state.notifications.find((n) => n.id === notificationId)
//         ?.read
//         ? state.unreadCount
//         : Math.max(0, state.unreadCount - 1),
//     }));
//   },

//   deleteAllNotifications: () => {
//     console.log("[Notifications] Deleting all notifications");
//     set({ notifications: [], unreadCount: 0 });
//   },

//   handleNotificationClick: (notification: Notification) => {
//     console.log("[Notifications] Handling notification click:", {
//       type: notification.type,
//       content: notification.content,
//       data: notification.data,
//     });

//     const router = useRouter();
//     const isAdmin = sessionStorage.getItem("user-role") === "admin";

//     if (!notification.read) {
//       console.log(
//         "[Notifications] Marking notification as read before navigation"
//       );
//       get().markAsRead(notification.id);
//     }

//     switch (notification.type) {
//       case "chat":
//         if (isAdmin) {
//           console.log(
//             "[Notifications] Admin navigating to chat with user:",
//             notification.data.userId
//           );
//           router.push(`/admin/chat?userId=${notification.data.userId}`);
//         } else {
//           console.log("[Notifications] User navigating to chat");
//           router.push("/dashboard/chat");
//         }
//         break;
//       case "transaction":
//         console.log(
//           "[Notifications] Navigating to transaction:",
//           notification.data.transactionId
//         );
//         router.push(
//           `/dashboard/transactions?txn=${notification.data.transactionId}`
//         );
//         break;
//       default:
//         console.log(
//           "[Notifications] Unknown notification type:",
//           notification.type
//         );
//         break;
//     }
//   },
// }));
