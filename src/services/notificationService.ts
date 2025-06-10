import { getIO } from "../websocket/socket";
import type { ITransaction } from "../models/Transaction";
import User from "../models/User";

type NotificationType = "chat" | "transaction";

interface NotificationPayload {
  type: NotificationType;
  content: string;
  data: {
    userId: string;
    [key: string]: any;
  };
}

class NotificationService {
  private io = getIO();

  // Transaction Notifications
  public sendTransactionNotification(
    userId: string,
    transaction: ITransaction,
    action: "create" | "update"
  ) {
    console.log("\n=== TRANSACTION NOTIFICATION - START ===");
    console.log(
      `[Notification] Sending ${action} transaction notification to user ${userId}`
    );
    console.log(`[Notification] Transaction details:`, {
      id: transaction._id,
      type: transaction.type,
      action: transaction.action,
      amount: transaction.amount,
      status: transaction.status,
    });

    const content = this.getTransactionNotificationContent(transaction);
    const payload: NotificationPayload = {
      type: "transaction",
      content,
      data: {
        userId,
        transactionId: transaction._id,
        type: transaction.type,
        action: transaction.action,
        amount: transaction.amount,
        status: transaction.status,
      },
    };

    console.log(
      `[Notification] Emitting transaction notification with payload:`,
      payload
    );
    this.io
      .of("/user-notifications")
      .to(`user_${userId}`)
      .emit("notification", payload);
    console.log("=== TRANSACTION NOTIFICATION - END ===\n");
  }

  // Chat Notifications
  public async sendChatNotification(
    recipientId: string,
    senderId: string,
    isAdmin: boolean
  ) {
    console.log("\n=== CHAT NOTIFICATION - START ===");
    console.log(`[Notification] Preparing chat notification:`, {
      recipientId,
      senderId,
      isAdmin,
    });

    let content = "";
    let senderName = "";

    if (isAdmin) {
      // Admin is sending to user
      content = "New message from admin";
      senderName = "admin";
    } else {
      // User is sending to admin
      // Only try to find user if senderId is not "admin"
      if (senderId !== "admin") {
        const user = await User.findById(senderId).select("firstName");
        senderName = user?.firstName || "user";
      } else {
        senderName = "user";
      }
      content = `New message from ${senderName}`;
    }

    console.log(`[Notification] Notification content: ${content}`);

    const payload: NotificationPayload = {
      type: "chat",
      content,
      data: {
        userId: recipientId, // The recipient's ID
        senderId: senderId, // The sender's ID
        senderName: senderName,
        isAdmin: isAdmin,
        timestamp: new Date().toISOString(),
      },
    };

    console.log(
      `[Notification] Emitting chat notification with payload:`,
      payload
    );

    if (isAdmin) {
      // Admin is sending to user
      console.log(
        `[Notification] Sending to user ${recipientId} notification room`
      );
      this.io
        .of("/user-notifications")
        .to(`user_${recipientId}`)
        .emit("notification", payload);
    } else {
      // User is sending to admin
      console.log(`[Notification] Sending to admin notification room`);
      this.io
        .of("/admin-notifications")
        .to("admin")
        .emit("notification", payload);
    }
    console.log("=== CHAT NOTIFICATION - END ===\n");
  }

  private getTransactionNotificationContent(transaction: ITransaction): string {
    return transaction.action === "credit" ? "Credit Alert" : "Debit Alert";
  }
}

export const notificationService = new NotificationService();
