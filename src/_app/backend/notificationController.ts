import { Request, Response } from "express";
import Notification from "../models/Notification";
import {
  sendUserNotification,
  sendAdminNotification,
} from "../websocket/notificationSocket";

// Get user notifications
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications" });
  }
};

// Get admin notifications
export const getAdminNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("userId", "firstName lastName email");

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin notifications" });
  }
};

// Mark notifications as read
export const markNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const { notificationIds } = req.body;
    await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { $set: { isRead: true } }
    );

    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error marking notifications as read" });
  }
};

// Create transaction notification
export const createTransactionNotification = async (
  userId: string,
  transaction: any
) => {
  try {
    let title = "";
    let message = "";

    // Determine notification content based on transaction type and action
    switch (transaction.type) {
      case "DEPOSIT":
        title = "Deposit Successful";
        message = `Your deposit of ${transaction.amount} ${transaction.currency} has been processed successfully.`;
        break;
      case "WITHDRAWAL":
        title = "Withdrawal Processed";
        message = `Your withdrawal of ${transaction.amount} ${transaction.currency} has been processed.`;
        break;
      case "TRANSFER":
        title = "Transfer Completed";
        message = `Your transfer of ${transaction.amount} ${transaction.currency} has been completed successfully.`;
        break;
      case "STOCK_PURCHASE":
        title = "Stock Purchase Confirmed";
        message = `Your purchase of ${transaction.quantity} shares of ${transaction.stockSymbol} has been confirmed.`;
        break;
      case "STOCK_SALE":
        title = "Stock Sale Confirmed";
        message = `Your sale of ${transaction.quantity} shares of ${transaction.stockSymbol} has been confirmed.`;
        break;
      default:
        title = "Transaction Update";
        message = `Your transaction has been ${transaction.status.toLowerCase()}.`;
    }

    const notification = await Notification.create({
      userId,
      title,
      message,
      type: "transaction",
      metadata: {
        transactionId: transaction._id,
        action: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
      },
    });

    // Send real-time notification to user
    sendUserNotification(userId, notification);

    // Send notification to admin
    const adminNotification = await Notification.create({
      userId,
      title: `New ${transaction.type} Transaction`,
      message: `User ${userId} has performed a ${transaction.type} transaction of ${transaction.amount} ${transaction.currency}`,
      type: "transaction",
      metadata: {
        transactionId: transaction._id,
        action: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
      },
    });

    sendAdminNotification(adminNotification);

    return notification;
  } catch (error) {
    console.error("Error creating transaction notification:", error);
    throw error;
  }
};
