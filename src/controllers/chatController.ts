import type { Request, Response, NextFunction } from "express";
import ChatMessage from "../models/ChatMessage";
import User from "../models/User";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { getIO } from "../websocket/socket";

const io = getIO();

// Helper function to safely stringify objects
const safeStringify = (obj: any) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return "Unable to stringify object";
  }
};

// @desc    Get user messages
// @route   GET /api/chat/messages
// @access  Private
export const getUserMessages = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    console.log(`[Chat] Fetching messages for user ID: ${userId}`);
    console.log(`[Chat] Request data:`, safeStringify(req.body));

    const messages = await ChatMessage.find({ userId }).sort({ createdAt: 1 });
    console.log(`[Chat] Found ${messages.length} messages for user ${userId}`);
    console.log(
      `[Chat] Message breakdown - User messages: ${
        messages.filter((m) => m.isUser).length
      }, Admin messages: ${messages.filter((m) => !m.isUser).length}`
    );
    console.log(`[Chat] Messages data:`, safeStringify(messages));

    // Mark all admin messages as read
    const updateResult = await ChatMessage.updateMany(
      { userId, isUser: false, isRead: false },
      { isRead: true }
    );
    console.log(
      `[Chat] Marked ${updateResult.modifiedCount} admin messages as read for user ${userId}`
    );
    console.log(`[Chat] Update result:`, safeStringify(updateResult));

    const response = {
      success: true,
      count: messages.length,
      data: messages,
    };
    console.log(`[Chat] Response data:`, safeStringify(response));

    res.status(200).json(response);
  }
);

// @desc    Get all messages (admin)
// @route   GET /api/chat/admin/messages
// @access  Private/Admin
export const getAllMessages = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("[Chat] Admin requesting all user conversations");
    console.log(`[Chat] Request data:`, safeStringify(req.body));

    // Group messages by userId
    const messagesByUser = await ChatMessage.aggregate([
      {
        $group: {
          _id: "$userId",
          messages: { $push: "$$ROOT" },
          lastMessage: { $last: "$message" },
          lastMessageAt: { $last: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isUser", true] },
                    { $eq: ["$isRead", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { lastMessageAt: -1 },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          userId: "$_id",
          userName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          userEmail: "$user.email",
          lastMessage: 1,
          lastMessageAt: 1,
          unreadCount: 1,
          messages: 1,
        },
      },
    ]);

    console.log(
      `[Chat] Found conversations for ${messagesByUser.length} users`
    );
    console.log(`[Chat] Conversations data:`, safeStringify(messagesByUser));

    const response = {
      success: true,
      count: messagesByUser.length,
      data: messagesByUser,
    };
    console.log(`[Chat] Response data:`, safeStringify(response));

    res.status(200).json(response);
  }
);

// @desc    Get user messages by user ID (admin)
// @route   GET /api/chat/admin/messages/:userId
// @access  Private/Admin
export const getUserMessagesByUserId = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    console.log(`[Chat] Admin requesting messages for user ID: ${userId}`);
    console.log(`[Chat] Request params:`, safeStringify(req.params));
    console.log(`[Chat] Request body:`, safeStringify(req.body));

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[Chat] User not found: ${userId}`);
      return next(new AppError("User not found", 404));
    }
    console.log(`[Chat] Found user:`, safeStringify(user));

    const messages = await ChatMessage.find({ userId }).sort({ createdAt: 1 });
    console.log(`[Chat] Found ${messages.length} messages for user ${userId}`);
    console.log(
      `[Chat] Message breakdown - User messages: ${
        messages.filter((m) => m.isUser).length
      }, Admin messages: ${messages.filter((m) => !m.isUser).length}`
    );
    console.log(`[Chat] Messages data:`, safeStringify(messages));

    // Mark all user messages as read
    const updateResult = await ChatMessage.updateMany(
      { userId, isUser: true, isRead: false },
      { isRead: true }
    );
    console.log(
      `[Chat] Marked ${updateResult.modifiedCount} user messages as read`
    );
    console.log(`[Chat] Update result:`, safeStringify(updateResult));

    const response = {
      success: true,
      count: messages.length,
      data: messages,
    };
    console.log(`[Chat] Response data:`, safeStringify(response));

    res.status(200).json(response);
  }
);

// @desc    Send message
// @route   POST /api/chat/messages
// @access  Private
export const sendMessage = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { message } = req.body;
    const userId = (req as any).user._id;
    console.log(`[Chat] User ${userId} sending message: ${message}`);
    console.log(`[Chat] Request data:`, safeStringify(req.body));

    // Create new message
    const chatMessage = await ChatMessage.create({
      userId,
      message,
      isUser: true,
      isRead: false,
    });
    console.log(`[Chat] Message saved:`, safeStringify(chatMessage));

    // Emit socket event
    const socketData = {
      userId,
      message: chatMessage,
    };
    io.to(`admin`).emit("new_message", socketData);
    console.log(`[Chat] Socket event data:`, safeStringify(socketData));

    const response = {
      success: true,
      data: chatMessage,
    };
    console.log(`[Chat] Response data:`, safeStringify(response));

    res.status(201).json(response);
  }
);

// @desc    Send admin message
// @route   POST /api/chat/admin/messages
// @access  Private/Admin
export const sendAdminMessage = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId, message } = req.body;
    console.log(`[Chat] Admin sending message to user ${userId}: ${message}`);
    console.log(`[Chat] Request data:`, safeStringify(req.body));

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[Chat] User not found: ${userId}`);
      return next(new AppError("User not found", 404));
    }
    console.log(`[Chat] Found user:`, safeStringify(user));

    // Create new message
    const chatMessage = await ChatMessage.create({
      userId,
      message,
      isUser: false,
      isRead: false,
    });
    console.log(`[Chat] Admin message saved:`, safeStringify(chatMessage));

    // Emit socket event
    const socketData = {
      message: chatMessage,
    };
    io.to(`user_${userId}`).emit("new_message", socketData);
    console.log(`[Chat] Socket event data:`, safeStringify(socketData));

    const response = {
      success: true,
      data: chatMessage,
    };
    console.log(`[Chat] Response data:`, safeStringify(response));

    res.status(201).json(response);
  }
);

// @desc    Mark messages as read
// @route   PUT /api/chat/messages/read
// @access  Private
export const markMessagesAsRead = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    console.log(`[Chat] User ${userId} marking admin messages as read`);
    console.log(`[Chat] Request data:`, safeStringify(req.body));

    // Mark all admin messages as read for this user
    const updateResult = await ChatMessage.updateMany(
      { userId, isUser: false, isRead: false },
      { isRead: true }
    );
    console.log(
      `[Chat] Marked ${updateResult.modifiedCount} admin messages as read for user ${userId}`
    );
    console.log(`[Chat] Update result:`, safeStringify(updateResult));

    const response = {
      success: true,
      message: "Messages marked as read",
    };
    console.log(`[Chat] Response data:`, safeStringify(response));

    res.status(200).json(response);
  }
);

// @desc    Mark admin messages as read
// @route   PUT /api/chat/admin/messages/:userId/read
// @access  Private/Admin
export const markAdminMessagesAsRead = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("\n=== MARK ADMIN MESSAGES AS READ - START ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Request Headers:", safeStringify(req.headers));
    console.log("Request Params:", safeStringify(req.params));
    console.log("Request Body:", safeStringify(req.body));
    console.log("Request Query:", safeStringify(req.query));
    console.log("Request User:", safeStringify((req as any).user));

    const { userId } = req.params;
    console.log(`\n[Chat] Admin marking user ${userId} messages as read`);
    console.log(`[Chat] Request params:`, safeStringify(req.params));
    console.log(`[Chat] Request body:`, safeStringify(req.body));

    // Check if user exists
    console.log("\n[Chat] Checking if user exists...");
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[Chat] ❌ User not found: ${userId}`);
      return next(new AppError("User not found", 404));
    }
    console.log(`[Chat] ✅ Found user:`, safeStringify(user));

    // Mark all user messages as read
    console.log("\n[Chat] Attempting to mark messages as read...");
    console.log(
      "[Chat] Query conditions:",
      safeStringify({
        userId,
        isUser: true,
        isRead: false,
      })
    );

    const updateResult = await ChatMessage.updateMany(
      { userId, isUser: true, isRead: false },
      { isRead: true }
    );
    console.log(
      `[Chat] ✅ Marked ${updateResult.modifiedCount} user messages as read`
    );
    console.log(`[Chat] Update result:`, safeStringify(updateResult));

    // Get count of remaining unread messages
    const remainingUnread = await ChatMessage.countDocuments({
      userId,
      isUser: true,
      isRead: false,
    });
    console.log(`[Chat] Remaining unread messages: ${remainingUnread}`);

    const response = {
      success: true,
      message: "Messages marked as read",
      data: {
        modifiedCount: updateResult.modifiedCount,
        remainingUnread,
      },
    };
    console.log(`\n[Chat] Response data:`, safeStringify(response));
    console.log("=== MARK ADMIN MESSAGES AS READ - END ===\n");

    res.status(200).json(response);
  }
);
