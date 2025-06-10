import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import User from "../models/User";
import Notification from "../models/Notification";
import mongoose from "mongoose";

let io: SocketIOServer;
const ORIGIN = "http://localhost:3000";
//const ORIGIN = "https://fidelitytrust.org";

// Store online users
const onlineUsers = new Map<string, string>(); // userId -> socketId
const notificationUsers = new Map<string, string>(); // userId -> socketId

export const initializeSocketIO = (httpServer: HTTPServer): SocketIOServer => {
  try {
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: ORIGIN,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // USER NAMESPACE
    const userNamespace = io.of("/user");
    userNamespace.on("connection", (socket) => {
      socket.on("join", async (userId: string) => {
        socket.join(userId);
        onlineUsers.set(userId, socket.id);
        userNamespace.to("/admin").emit("user_status", {
          userId,
          status: "online",
        });

        const user = await User.findById(userId).select(
          "firstName lastName email"
        );
        if (user) {
          io.of("/admin").emit("user_joined", {
            userId,
            user: {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            },
          });
        }
      });

      socket.on("typing", ({ userId, isTyping }) => {
        io.of("/admin").emit(isTyping ? "user_typing" : "user_stopped_typing", {
          userId,
        });
      });

      socket.on("message", ({ userId, message }) => {
        const transformedMessage = {
          _id: message._id,
          content: message.content || message.message,
          sender: "customer",
          timestamp: message.timestamp || message.createdAt,
          isRead: message.isRead || false,
          userId: message.userId || userId,
        };

        io.of("/admin").emit("new_message", transformedMessage);
      });

      socket.on("mark_read", ({ userId, messageIds }) => {
        io.of("/admin").emit("messages_read", { userId, messageIds });
      });

      socket.on("disconnect", () => {
        for (const [userId, socketId] of onlineUsers.entries()) {
          if (socketId === socket.id) {
            onlineUsers.delete(userId);
            io.of("/admin").emit("user_status", {
              userId,
              status: "offline",
            });
            break;
          }
        }
      });
    });

    // ADMIN NAMESPACE
    const adminNamespace = io.of("/admin");
    adminNamespace.on("connection", (socket) => {
      socket.on("admin_typing", ({ userId, isTyping }) => {
        io.of("/user")
          .to(userId)
          .emit(isTyping ? "admin_typing" : "admin_stopped_typing");
      });

      socket.on("message", ({ userId, message }) => {
        const transformedMessage = {
          _id: message._id,
          content: message.content || message.message,
          sender: "admin",
          timestamp: message.timestamp || message.createdAt,
          isRead: message.isRead || false,
          userId: message.userId || userId,
        };

        io.of("/user").to(userId).emit("new_message", transformedMessage);
      });

      socket.on("admin_mark_read", ({ userId, messageIds }) => {
        io.of("/user").to(userId).emit("admin_read_messages", { messageIds });
      });
    });

    // USER NOTIFICATION NAMESPACE
    const userNotificationNamespace = io.of("/user-notifications");
    userNotificationNamespace.on("connection", (socket) => {
    // //  console.log("[Notifications] User notification socket connected", {
    //     socketId: socket.id,
    //     transport: socket.conn.transport.name,
    //   });

      socket.on("join", (roomName: string, callback) => {
        // console.log(`[Notifications] Join request received:`, {
        //   roomName,
        //   socketId: socket.id,
        //   transport: socket.conn.transport.name,
        // });

        try {
          socket.join(roomName);
          const userId = roomName.replace("user_", "");
          notificationUsers.set(userId, socket.id);

          // console.log(`[Notifications] User successfully joined room:`, {
          //   roomName,
          //   userId,
          //   socketId: socket.id,
          //   rooms: Array.from(socket.rooms),
          // });

          // Send acknowledgment
          // if (callback) {
          //   callback({ success: true, room: roomName });
          // }

          // Emit joined_room event
          // socket.emit("joined_room", { room: roomName });
        } catch (error) {
          console.error(`[Notifications] Error joining room:`, {
            roomName,
            error,
            socketId: socket.id,
          });
          if (callback) {
            callback({ success: false, error: "Failed to join room" });
          }
        }
      });

      socket.on("notification", (data) => {
       // console.log(`[Notifications] Received notification for user:`, data);
      });

      socket.on("disconnect", () => {
        console.log("[Notifications] User notification socket disconnected");
        for (const [userId, socketId] of notificationUsers.entries()) {
          if (socketId === socket.id) {
            notificationUsers.delete(userId);
            break;
          }
        }
      });
    });

    // ADMIN NOTIFICATION NAMESPACE
    const adminNotificationNamespace = io.of("/admin-notifications");
    adminNotificationNamespace.on("connection", (socket) => {
   //   console.log("[Notifications] Admin notification socket connected");

      socket.on("join", () => {
     //   console.log("[Notifications] Admin joining notification room");
        socket.join("admin");
      });

      socket.on("notification", (data) => {
    //    console.log(`[Notifications] Received notification for admin:`, data);
      });

      socket.on("disconnect", () => {
   //     console.log("[Notifications] Admin notification socket disconnected");
      });
    });

    console.log("✅ Socket.IO initialized successfully with all namespaces");
    return io;
  } catch (error) {
    console.error("❌ Failed to initialize Socket.IO:", error);
    throw error;
  }
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

export const isUserOnline = (userId: string): boolean => {
  return onlineUsers.has(userId);
};

// Notification helper functions
export const sendUserNotification = (
  userId: string | mongoose.Types.ObjectId,
  notification: any
) => {
  const io = getIO();
  const roomName = `user_${userId}`;
  console.log(
    `[Notifications] Sending notification to room ${roomName}:`,
    notification
  );
  io.of("/user-notifications").to(roomName).emit("notification", notification);
};

export const sendAdminNotification = (notification: any) => {
  const io = getIO();
  // console.log(
  //   `[Notifications] Sending notification to admin room:`,
  //   notification
  // );
  io.of("/admin-notifications").to("admin").emit("notification", notification);
};

export const joinNotificationRoom = (
  userId: string | mongoose.Types.ObjectId
) => {
  const io = getIO();
  const roomName = `user_${userId}`;
  console.log(`[Notifications] User ${userId} joining room ${roomName}`);
  io.of("/user-notifications").socketsJoin(roomName);
};

export const joinAdminNotificationRoom = () => {
  const io = getIO();
  console.log("[Notifications] Admin joining notification room");
  io.of("/admin-notifications").socketsJoin("admin");
};

export const leaveNotificationRoom = (
  userId: string | mongoose.Types.ObjectId
) => {
  const io = getIO();
  const roomName = `user_${userId}`;
  console.log(`[Notifications] User ${userId} leaving room ${roomName}`);
  io.of("/user-notifications").socketsLeave(roomName);
};

export const leaveAdminNotificationRoom = () => {
  const io = getIO();
  console.log("[Notifications] Admin leaving notification room");
  io.of("/admin-notifications").socketsLeave("admin");
};
