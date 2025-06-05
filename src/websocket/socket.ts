// import { Server as SocketIOServer } from "socket.io";
// import type { Server as HTTPServer } from "http";
// import User from "../models/User";

// let io: SocketIOServer;

// // Store online users
// const onlineUsers = new Map<string, string>(); // userId -> socketId

// export const initializeSocketIO = (httpServer: HTTPServer): SocketIOServer => {
//   try {
//     io = new SocketIOServer(httpServer, {
//       cors: {
//         origin: process.env.CORS_ORIGIN || "http://localhost:3000",
//         methods: ["GET", "POST"],
//         credentials: true,
//       },
//     });

//     io.on("connection", (socket) => {
//       console.log(`✅ User connected: ${socket.id}`);

//       // Join user to their room and admin room
//       socket.on("join", async (userId: string) => {
//         socket.join(userId);
//         socket.join("admin");
//         onlineUsers.set(userId, socket.id);

//         // Notify admin about user's online status
//         io.to("admin").emit("user_status", {
//           userId,
//           status: "online",
//         });

//         // Get user details for admin
//         const user = await User.findById(userId).select(
//           "firstName lastName email"
//         );
//         if (user) {
//           io.to("admin").emit("user_joined", {
//             userId,
//             user: {
//               firstName: user.firstName,
//               lastName: user.lastName,
//               email: user.email,
//             },
//           });
//         }
//       });

//       // Handle typing indicator
//       socket.on("typing", ({ userId, isTyping }) => {
//         if (isTyping) {
//           socket.to("admin").emit("user_typing", { userId });
//         } else {
//           socket.to("admin").emit("user_stopped_typing", { userId });
//         }
//       });

//       // Handle admin typing
//       socket.on("admin_typing", ({ userId, isTyping }) => {
//         if (isTyping) {
//           socket.to(userId).emit("admin_typing");
//         } else {
//           socket.to(userId).emit("admin_stopped_typing");
//         }
//       });

//       // Handle chat messages
//       socket.on("message", (data) => {
//         const { userId, message, isAdmin } = data;
//         console.log("[Socket] Received message event:", {
//           userId,
//           message,
//           isAdmin,
//         });

//         // Transform message to consistent format
//         const transformedMessage = {
//           _id: message._id,
//           content: message.content || message.message,
//           sender: isAdmin ? "admin" : "user",
//           timestamp: message.timestamp || message.createdAt,
//           isRead: message.isRead || false,
//           userId: message.userId || userId,
//         };

//         console.log("[Socket] Transformed message:", transformedMessage);

//         // Emit to specific user or admin
//         if (isAdmin) {
//           console.log("[Socket] Broadcasting admin message to user:", userId);
//           socket.to(userId).emit("new_message", transformedMessage);
//         } else {
//           console.log("[Socket] Broadcasting user message to admin");
//           socket.to("admin").emit("new_message", transformedMessage);
//         }
//       });

//       // Handle read receipts
//       socket.on("mark_read", ({ userId, messageIds }) => {
//         socket.to("admin").emit("messages_read", {
//           userId,
//           messageIds,
//         });
//       });

//       // Handle admin read receipts
//       socket.on("admin_mark_read", ({ userId, messageIds }) => {
//         socket.to(userId).emit("admin_read_messages", {
//           messageIds,
//         });
//       });

//       socket.on("disconnect", () => {
//         // Find and remove user from online users
//         for (const [userId, socketId] of onlineUsers.entries()) {
//           if (socketId === socket.id) {
//             onlineUsers.delete(userId);
//             // Notify admin about user's offline status
//             io.to("admin").emit("user_status", {
//               userId,
//               status: "offline",
//             });
//             break;
//           }
//         }
//         console.log(`❌ User disconnected: ${socket.id}`);
//       });
//     });

//     console.log("✅ Socket.IO initialized successfully");
//     return io;
//   } catch (error) {
//     console.error("❌ Failed to initialize Socket.IO:", error);
//     throw error;
//   }
// };

// export const getIO = (): SocketIOServer => {
//   if (!io) {
//     throw new Error("Socket.IO not initialized");
//   }
//   return io;
// };

// export const isUserOnline = (userId: string): boolean => {
//   return onlineUsers.has(userId);
// };

import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import User from "../models/User";

let io: SocketIOServer;

// Store online users
const onlineUsers = new Map<string, string>(); // userId -> socketId

export const initializeSocketIO = (httpServer: HTTPServer): SocketIOServer => {
  try {
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // USER NAMESPACE
    const userNamespace = io.of("/user");
    userNamespace.on("connection", (socket) => {
      console.log(`✅ [USER NAMESPACE] Connected: ${socket.id}`);
      console.log(`[USER NAMESPACE] Socket details:`, {
        id: socket.id,
        handshake: {
          query: socket.handshake.query,
          headers: socket.handshake.headers,
          address: socket.handshake.address,
        },
      });

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
        console.log(`❌ [USER NAMESPACE] Disconnected: ${socket.id}`);
      });
    });

    // ADMIN NAMESPACE
    const adminNamespace = io.of("/admin");
    adminNamespace.on("connection", (socket) => {
      console.log(`✅ [ADMIN NAMESPACE] Connected: ${socket.id}`);
      console.log(`[ADMIN NAMESPACE] Socket details:`, {
        id: socket.id,
        handshake: {
          query: socket.handshake.query,
          headers: socket.handshake.headers,
          address: socket.handshake.address,
        },
      });

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

      socket.on("disconnect", () => {
        console.log(`❌ [ADMIN NAMESPACE] Disconnected: ${socket.id}`);
      });
    });

    console.log("✅ Namespaced Socket.IO initialized");
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
