import type { Request, Response, NextFunction } from "express";
import Transaction, {
  TransactionType,
  TransactionAction,
  TransactionStatus,
  type ITransaction,
} from "../models/Transaction";
import User from "../models/User";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { notificationService } from "../services/notificationService";

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private/Admin
export const getAllTransactions = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const transactions = await Transaction.find()
      .populate("userId", "firstName lastName email accountNumber")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  }
);

// @desc    Get transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
export const getTransactionById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await Transaction.findById(req.params.id).populate(
      "userId",
      "firstName lastName email accountNumber"
    );

    if (!transaction) {
      return next(new AppError("Transaction not found", 404));
    }

    // Check if user is authorized to view this transaction
    const userId = (req as any).user._id;
    const userRole = (req as any).user.role;

    if (
      userRole !== "admin" &&
      transaction.userId.toString() !== userId.toString()
    ) {
      return next(
        new AppError("Not authorized to access this transaction", 403)
      );
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  }
);

// @desc    Get transaction by ID (Admin only)
// @route   GET /api/transactions/admin/:id
// @access  Private/Admin
export const getAdminTransactionById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await Transaction.findById(req.params.id)
      .populate("userId", "firstName lastName email accountNumber phoneNumber")
      .lean();

    if (!transaction) {
      return next(new AppError("Transaction not found", 404));
    }

    // Get additional user details if needed
    const user = await User.findById(transaction.userId).select(
      "currentBalance availableBalance accountNumber"
    );

    res.status(200).json({
      success: true,
      data: {
        ...transaction,
        userDetails: user,
      },
    });
  }
);

// @desc    Get user transactions
// @route   GET /api/transactions/user
// @access  Private
export const getUserTransactions = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    const transactions = await Transaction.find({ userId })
      .populate("userId", "firstName lastName email accountNumber")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  }
);

// @desc    Create transaction
// @route   POST /api/transactions
// @access  Private
export const createTransaction = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { type, subtype, status, action, amount, data, userId } = req.body;

    // Validate transaction type and action
    if (!Object.values(TransactionType).includes(type)) {
      return next(new AppError("Invalid transaction type", 400));
    }

    if (!Object.values(TransactionAction).includes(action)) {
      return next(new AppError("Invalid transaction action", 400));
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // For debit transactions, check if user has sufficient available balance
    if (action === TransactionAction.DEBIT && user.availableBalance < amount) {
      return next(new AppError("Insufficient available balance", 400));
    }

    // Create transaction
    const transaction = await Transaction.create({
      userId,
      type,
      subtype,
      action,
      amount,
      status: status ?? TransactionStatus.PENDING,
      data,
    });

    // Handle balance updates based on transaction type and status
    if (action === TransactionAction.CREDIT) {
      if (status === TransactionStatus.SUCCESS) {
        // For successful credit, add to both balances
        user.availableBalance += amount;
        user.currentBalance += amount;
      } else if (status === TransactionStatus.PENDING) {
        // For pending credit, add only to current balance
        user.currentBalance += amount;
      }
    } else if (action === TransactionAction.DEBIT) {
      if (status === TransactionStatus.SUCCESS) {
        // For successful debit, deduct from available balance
        user.availableBalance -= amount;
      } else if (status === TransactionStatus.PENDING) {
        // For pending debit, deduct from available and add to current
        user.availableBalance -= amount;
        user.currentBalance += amount;
      }
    }

    await user.save();

    // Send notification
    notificationService.sendTransactionNotification(
      userId,
      transaction,
      "create"
    );

    res.status(201).json({
      success: true,
      data: transaction,
    });
  }
);

// @desc    Update transaction
// @route   PUT /api/transactions/admin/update-transaction-by-id/:id
// @access  Private/Admin
export const updateTransaction = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const transactionId = req.params.id;
    const updateData = req.body;

    // Find transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return next(new AppError("Transaction not found", 404));
    }

    // Validate status if it's being updated
    if (
      updateData.status &&
      !Object.values(TransactionStatus).includes(updateData.status)
    ) {
      return next(new AppError("Invalid transaction status", 400));
    }

    // Validate type if it's being updated
    if (
      updateData.type &&
      !Object.values(TransactionType).includes(updateData.type)
    ) {
      return next(new AppError("Invalid transaction type", 400));
    }

    // Validate action if it's being updated
    if (
      updateData.action &&
      !Object.values(TransactionAction).includes(updateData.action)
    ) {
      return next(new AppError("Invalid transaction action", 400));
    }

    // Validate amount if it's being updated
    if (updateData.amount && updateData.amount < 0.01) {
      return next(new AppError("Amount must be greater than 0", 400));
    }

    // Find user if we need to update balances
    const user = await User.findById(transaction.userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Handle status changes if status is being updated
    if (updateData.status && updateData.status !== transaction.status) {
      if (transaction.action === TransactionAction.CREDIT) {
        if (transaction.status === TransactionStatus.PENDING) {
          if (updateData.status === TransactionStatus.SUCCESS) {
            // For credit pending to success, add to available balance only
            user.availableBalance += transaction.amount;
          } else if (updateData.status === TransactionStatus.FAILED) {
            // For failed credit, remove from current balance
            user.currentBalance -= transaction.amount;
          }
        }
      } else if (transaction.action === TransactionAction.DEBIT) {
        if (transaction.status === TransactionStatus.PENDING) {
          if (updateData.status === TransactionStatus.SUCCESS) {
            // For debit pending to success, remove from current balance only
            user.currentBalance -= transaction.amount;
          } else if (updateData.status === TransactionStatus.FAILED) {
            // For failed debit, restore available balance and remove from current
            user.availableBalance += transaction.amount;
            user.currentBalance -= transaction.amount;
          }
        }
      }
      await user.save();
    }

    // Update transaction with all provided fields
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("userId", "firstName lastName email accountNumber phoneNumber");

    // Send notification
    notificationService.sendTransactionNotification(
      transaction.userId.toString(),
      updatedTransaction,
      "update"
    );

    res.status(200).json({
      success: true,
      data: updatedTransaction,
    });
  }
);

// @desc    Fund wallet
// @route   POST /api/transactions/fund
// @access  Private
export const fundWallet = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { amount, subtype, ...additionalData } = req.body;
    const userId = (req as any).user._id;

    // Create transaction
    const transaction = await Transaction.create({
      userId,
      type: TransactionType.FUND_WALLET,
      subtype: subtype,
      action: TransactionAction.CREDIT,
      amount,
      status: TransactionStatus.PENDING,
      data: {
        ...additionalData,
      },
    });

    // Update user's current balance for pending transaction
    const user = await User.findById(userId);
    if (user) {
      user.currentBalance += amount;
      await user.save();
    }

    // Send notification
    notificationService.sendTransactionNotification(
      userId,
      transaction,
      "create"
    );

    res.status(201).json({
      success: true,
      data: transaction,
    });
  }
);

// @desc    Withdraw
// @route   POST /api/transactions/withdraw
// @access  Private
export const withdraw = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { amount, subtype, ...additionalData } = req.body;
    const userId = (req as any).user._id;

    // Check if user has sufficient available balance
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (user.availableBalance < amount) {
      return next(new AppError("Insufficient available balance", 400));
    }

    // Create transaction
    const transaction = await Transaction.create({
      userId,
      type: TransactionType.WITHDRAW,
      subtype: subtype,
      action: TransactionAction.DEBIT,
      amount,
      status: TransactionStatus.PENDING,
      data: {
        ...additionalData,
      },
    });

    // Update balances for pending transaction
    user.availableBalance -= amount;
    user.currentBalance += amount;
    await user.save();

    // Send notification
    notificationService.sendTransactionNotification(
      userId,
      transaction,
      "create"
    );

    res.status(201).json({
      success: true,
      data: transaction,
    });
  }
);

export const sendMoney = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { amount, subtype, ...additionalData } = req.body;
    const userId = (req as any).user._id;

    // Check if user has sufficient available balance
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (user.availableBalance < amount) {
      return next(new AppError("Insufficient available balance", 400));
    }

    // Check if recipient exists
    const recipientId = additionalData.data?.recipientId;
    const recipient = await User.findById(recipientId);
    if (!recipient && subtype === "member") {
      return next(new AppError("Recipient not found", 404));
    }

    // Create sender's transaction
    const senderTransaction = await Transaction.create({
      userId,
      type: TransactionType.SEND_MONEY,
      subtype: subtype,
      action: TransactionAction.DEBIT,
      amount,
      status: TransactionStatus.PENDING,
      data: {
        ...additionalData,
      },
    });

    let recipientTransaction: ITransaction | null = null;

    // Only create recipient transaction if subtype is 'member'
    if (subtype === "member" && recipient) {
      recipientTransaction = await Transaction.create({
        userId: recipientId,
        type: TransactionType.FUND_WALLET,
        subtype: subtype,
        action: TransactionAction.CREDIT,
        amount,
        status: TransactionStatus.PENDING,
        data: {
          senderId: userId,
          senderName: `${user.firstName} ${user.lastName}`,
          senderAccountNumber: user.accountNumber,
          ...additionalData,
        },
      });

      // Update recipient's current balance for pending transaction
      recipient.currentBalance += amount;
      await recipient.save();

      // Send notification to recipient
      notificationService.sendTransactionNotification(
        recipientId,
        recipientTransaction,
        "create"
      );
    }

    // Update sender's balances for pending transaction
    user.availableBalance -= amount;
    user.currentBalance += amount;
    await user.save();

    // Send notification to sender
    notificationService.sendTransactionNotification(
      userId,
      senderTransaction,
      "create"
    );

    res.status(201).json({
      success: true,
      data: {
        senderTransaction,
        ...(recipientTransaction && { recipientTransaction }),
      },
    });
  }
);
