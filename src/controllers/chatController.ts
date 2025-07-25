import type { Request, Response, NextFunction } from "express";
import ChatMessage from "../models/ChatMessage";
import User from "../models/User";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { getIO } from "../websocket/socket";
import { notificationService } from "../services/notificationService";

const io = getIO();

// @desc    Get user messages
// @route   GET /api/chat/messages
// @access  Private
export const getUserMessages = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    const messages = await ChatMessage.find({ userId }).sort({ createdAt: 1 });

    // Mark all admin messages as read
    await ChatMessage.updateMany(
      { userId, isUser: false, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  }
);

// @desc    Get all messages (admin)
// @route   GET /api/chat/admin/messages
// @access  Private/Admin
export const getAllMessages = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
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

    res.status(200).json({
      success: true,
      count: messagesByUser.length,
      data: messagesByUser,
    });
  }
);

// @desc    Get user messages by user ID (admin)
// @route   GET /api/chat/admin/messages/:userId
// @access  Private/Admin
export const getUserMessagesByUserId = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const messages = await ChatMessage.find({ userId }).sort({ createdAt: 1 });

    // Mark all user messages as read
    await ChatMessage.updateMany(
      { userId, isUser: true, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  }
);

// @desc    Send message
// @route   POST /api/chat/messages
// @access  Private
export const sendMessage = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { message } = req.body;
    const userId = (req as any).user._id;

    // Create new message
    const chatMessage = await ChatMessage.create({
      userId,
      message,
      isUser: true,
      isRead: false,
    });

    // Emit socket event
    const socketData = {
      userId,
      message: chatMessage,
    };
    io.to(`admin`).emit("new_message", socketData);

    // Send notification to admin
    notificationService.sendChatNotification("admin", userId, false);

    res.status(201).json({
      success: true,
      data: chatMessage,
    });
  }
);

// @desc    Send admin message
// @route   POST /api/chat/admin/messages
// @access  Private/Admin
export const sendAdminMessage = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId, message } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Create new message
    const chatMessage = await ChatMessage.create({
      userId,
      message,
      isUser: false,
      isRead: false,
    });

    // Emit socket event
    const socketData = {
      message: chatMessage,
    };
    io.to(`user_${userId}`).emit("new_message", socketData);

    // Send notification to user
    notificationService.sendChatNotification(userId, "admin", true);

    res.status(201).json({
      success: true,
      data: chatMessage,
    });
  }
);

// @desc    Mark messages as read
// @route   PUT /api/chat/messages/read
// @access  Private
export const markMessagesAsRead = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    // Mark all admin messages as read for this user
    await ChatMessage.updateMany(
      { userId, isUser: false, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  }
);

// @desc    Mark admin messages as read
// @route   PUT /api/chat/admin/messages/:userId/read
// @access  Private/Admin
export const markAdminMessagesAsRead = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Mark all user messages as read
    const updateResult = await ChatMessage.updateMany(
      { userId, isUser: true, isRead: false },
      { isRead: true }
    );

    // Get count of remaining unread messages
    const remainingUnread = await ChatMessage.countDocuments({
      userId,
      isUser: true,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
      data: {
        modifiedCount: updateResult.modifiedCount,
        remainingUnread,
      },
    });
  }
);
