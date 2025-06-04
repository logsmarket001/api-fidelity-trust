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
    const { type, subtype, action, amount, data,userId } = req.body;

  

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

    // For debit transactions, check if user has sufficient current balance
    if (action === TransactionAction.DEBIT && user.currentBalance < amount) {
      return next(new AppError("Insufficient current balance", 400));
    }

    // Create transaction
    const transaction = await Transaction.create({
      userId,
      type,
      subtype,
      action,
      amount,
      status: TransactionStatus.PENDING,
      data,
    });

    // Update user's current balance immediately
    if (action === TransactionAction.CREDIT) {
      user.currentBalance += amount;
    } else if (action === TransactionAction.DEBIT) {
      user.currentBalance -= amount;
    }
    await user.save();

    res.status(201).json({
      success: true,
      data: transaction,
    });
  }
);

// @desc    Update transaction status
// @route   PUT /api/transactions/:id/status
// @access  Private/Admin
export const updateTransactionStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status } = req.body;
    const transactionId = req.params.id;

    // Validate status
    if (!Object.values(TransactionStatus).includes(status)) {
      return next(new AppError("Invalid transaction status", 400));
    }

    // Find transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return next(new AppError("Transaction not found", 404));
    }

    // If status is already the same, return
    if (transaction.status === status) {
      return res.status(200).json({
        success: true,
        data: transaction,
      });
    }

    // Find user
    const user = await User.findById(transaction.userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Update transaction status
    transaction.status = status;
    await transaction.save();

    // If status is SUCCESS, update available balance
    if (status === TransactionStatus.SUCCESS) {
      if (transaction.action === TransactionAction.CREDIT) {
        user.availableBalance += transaction.amount;
      } else if (transaction.action === TransactionAction.DEBIT) {
        user.availableBalance -= transaction.amount;
      }
    }
    // If status is FAILED, revert current balance
    else if (status === TransactionStatus.FAILED) {
      if (transaction.action === TransactionAction.CREDIT) {
        user.currentBalance -= transaction.amount;
      } else if (transaction.action === TransactionAction.DEBIT) {
        user.currentBalance += transaction.amount;
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: transaction,
    });
  }
);

// @desc    Fund wallet
// @route   POST /api/transactions/fund
// @access  Private
export const fundWallet = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("this is the request body that came in",req.body)
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

    console.log("this is the created transaction ================================")
    console.log(transaction)
        console.log("this is the created transaction ================================")

    // Update user's current balance
    const user = await User.findById(userId);
    if (user) {
      user.currentBalance += amount;
      await user.save();
    }

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

    // Check if user has sufficient current balance
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (user?.currentBalance < amount) {
      return next(new AppError("Insufficient current balance", 400));
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

    // Update user's current balance
    user.currentBalance -= amount;
    await user.save();

    res.status(201).json({
      success: true,
      data: transaction,
    });
  }
);

// @desc    Send money
// @route   POST /api/transactions/send
// @access  Private
// export const sendMoney = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const { amount, subtype, ...additionalData } = req.body;
//     const userId = (req as any).user._id;

//     // Check if user has sufficient current balance
//     const user = await User.findById(userId);
//     if (!user) {
//       return next(new AppError("User not found", 404));
//     }

//     if (user.currentBalance < amount) {
//       return next(new AppError("Insufficient current balance", 400));
//     }

//     // Check if recipient exists
//     // const recipient = await User.findById(recipientId);
//     // if (!recipient) {
//     //   return next(new AppError("Recipient not found", 404));
//     // }

//     // Create sender's transaction
//     const senderTransaction = await Transaction.create({
//       userId,
//       type: TransactionType.SEND_MONEY,
//       subtype: subtype ,
//       action: TransactionAction.DEBIT,
//       amount,
//       status: TransactionStatus.PENDING,
//       data: {

//         ...additionalData,
//       },
//     });

//     console.log("this subtype", subtype)
//     console.log()
//     // Create recipient's transaction
//     // await Transaction.create({
//     //   userId: recipientId,
//     //   type: TransactionType.FUND_WALLET,
//     //   subtype: subtype || "direct_transfer",
//     //   action: TransactionAction.CREDIT,
//     //   amount,
//     //   status: TransactionStatus.PENDING,
//     //   data: {
//     //     senderId: userId,
//     //     senderName: `${user.firstName} ${user.lastName}`,
//     //     senderAccountNumber: user.accountNumber,
//     //     ...additionalData,
//     //   },
//     // });

//     // Update sender's current balance
//     user.currentBalance -= amount;
//     await user.save();

//     res.status(201).json({
//       success: true,
//       data: senderTransaction,
//     });
//   }
// );


export const sendMoney = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { amount, subtype, ...additionalData } = req.body;
    const userId = (req as any).user._id;

    // Check if user has sufficient current balance
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (user.currentBalance < amount) {
      return next(new AppError("Insufficient current balance", 400));
    }

    // Check if recipient exists
    const recipientId = additionalData.data?.recipientId;
    // if (!recipientId) {
    //   return next(new AppError("Recipient ID is required", 400));
    // }

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

      // Update recipient's current balance only for member transactions
      recipient.currentBalance += amount;
      await recipient.save();
    }

    // Update sender's current balance
    user.currentBalance -= amount;
    await user.save();

    res.status(201).json({
      success: true,
      data: {
        senderTransaction,
        ...(recipientTransaction && { recipientTransaction }),
      },
    });
  }
);
