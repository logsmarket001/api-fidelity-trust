// import { Request, Response, NextFunction } from "express";
// import Notification from "../models/Notification";
// import {
//   sendUserNotification,
//   sendAdminNotification,
// } from "../websocket/notificationSocket";
// import mongoose from "mongoose";
// import { AppError } from "../utils/appError";
// import { asyncHandler } from "../utils/asyncHandler";

// // Get user notifications
// export const getUserNotifications = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { userId } = req.params;
//     if (!userId) {
//       return next(new AppError("User ID is required", 400));
//     }

//     const notifications = await Notification.find({ userId })
//       .sort({ createdAt: -1 })
//       .limit(50);

//     res.json(notifications);
//   }
// );

// // Get admin notifications
// export const getAdminNotifications = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const notifications = await Notification.find()
//       .sort({ createdAt: -1 })
//       .limit(50)
//       .populate("userId", "firstName lastName email");

//     res.json(notifications);
//   }
// );

// // Mark notifications as read
// export const markNotificationsAsRead = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { notificationIds } = req.body;
//     await Notification.updateMany(
//       { _id: { $in: notificationIds } },
//       { $set: { isRead: true } }
//     );

//     res.json({ message: "Notifications marked as read" });
//   }
// );

// // Create transaction notification
// export const createTransactionNotification = async (
//   userId: mongoose.Types.ObjectId,
//   transaction: any
// ) => {
//   try {
//     let title = "";
//     let message = "";

//     // Determine notification content based on transaction type and action
//     switch (transaction.type) {
//       case "DEPOSIT":
//         title = "Deposit Successful";
//         message = `Your deposit of ${transaction.amount} ${transaction.currency} has been processed successfully.`;
//         break;
//       case "WITHDRAWAL":
//         title = "Withdrawal Processed";
//         message = `Your withdrawal of ${transaction.amount} ${transaction.currency} has been processed.`;
//         break;
//       case "TRANSFER":
//         title = "Transfer Completed";
//         message = `Your transfer of ${transaction.amount} ${transaction.currency} has been completed successfully.`;
//         break;
//       case "STOCK_PURCHASE":
//         title = "Stock Purchase Confirmed";
//         message = `Your purchase of ${transaction.quantity} shares of ${transaction.stockSymbol} has been confirmed.`;
//         break;
//       case "STOCK_SALE":
//         title = "Stock Sale Confirmed";
//         message = `Your sale of ${transaction.quantity} shares of ${transaction.stockSymbol} has been confirmed.`;
//         break;
//       default:
//         title = "Transaction Update";
//         message = `Your transaction has been ${transaction.status.toLowerCase()}.`;
//     }

//     const notification = await Notification.create({
//       userId,
//       title,
//       message,
//       type: "transaction",
//       metadata: {
//         transactionId: transaction._id,
//         action: transaction.type,
//         amount: transaction.amount,
//         currency: transaction.currency,
//       },
//     });

//     // Send real-time notification to user
//     sendUserNotification(userId, notification);

//     // Send notification to admin
//     const adminNotification = await Notification.create({
//       userId,
//       title: `New ${transaction.type} Transaction`,
//       message: `User ${userId} has performed a ${transaction.type} transaction of ${transaction.amount} ${transaction.currency}`,
//       type: "transaction",
//       metadata: {
//         transactionId: transaction._id,
//         action: transaction.type,
//         amount: transaction.amount,
//         currency: transaction.currency,
//       },
//     });

//     sendAdminNotification(adminNotification);

//     return notification;
//   } catch (error) {
//     console.error("Error creating transaction notification:", error);
//     throw error;
//   }
// };
