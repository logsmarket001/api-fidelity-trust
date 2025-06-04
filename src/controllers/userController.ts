import type { Request, Response, NextFunction } from "express";
import User, { UserRole } from "../models/User";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { usersData } from "../utils/data";

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const users = await User.find().select("-password");

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  }
);

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  }
);

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
export const createUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      currentBalance,
      availableBalance,
      pin,
    } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError("User already exists", 400));
    }

    // Validate required fields based on role
    if (role === UserRole.ADMIN) {
      if (!firstName || !lastName || !email || !password) {
        return next(
          new AppError(
            "First name, last name, email, and password are required for admin",
            400
          )
        );
      }
    } else {
      if (
        !firstName ||
        !lastName ||
        !email ||
        !password ||
        !pin ||
        !currentBalance ||
        !availableBalance
      ) {
        return next(
          new AppError("All fields are required for regular users", 400)
        );
      }
    }

    // Create user object based on role
    const userData = {
      firstName,
      lastName,
      email,
      password,
      role: role || UserRole.USER,
      isEmailVerified: role === UserRole.ADMIN ? true : false,
      kycVerified: role === UserRole.ADMIN ? true : false,
      lastLogin: new Date(),
    };

    // Add role-specific fields
    if (role !== UserRole.ADMIN) {
      Object.assign(userData, {
        currentBalance,
        availableBalance,
        balance: currentBalance, // Set initial balance same as current balance
        pin,
        balanceVisibility: {
          available: true,
          current: true,
        },
      });
    }

    // Create new user
    const user = await User.create(userData);

    // Prepare response data based on role
    const responseData = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      kycVerified: user.kycVerified,
    };

    // Add role-specific response data
    if (role !== UserRole.ADMIN) {
      Object.assign(responseData, {
        balance: user.balance,
        availableBalance: user.availableBalance,
        currentBalance: user.currentBalance,
        accountNumber: user.accountNumber,
        balanceVisibility: user.balanceVisibility,
      });
    }

    res.status(201).json({
      success: true,
      data: responseData,
    });
  }
);

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("🔵 Starting user update process...");
    console.log("📝 Request body:", JSON.stringify(req.body, null, 2));

    const {
      firstName,
      lastName,
      email,
      password,
      pin,
      role,
      balance,
      availableBalance,
      currentBalance,
      isEmailVerified,
      kycVerified,
      balanceVisibility,
      personalInfo,
      lastLogin,
    } = req.body;

    // Find user by id
    console.log("🔍 Finding user with ID:", req.params.id);
    let user = await User.findById(req.params.id).select("+password +pin");

    if (!user) {
      console.log("❌ User not found with ID:", req.params.id);
      return next(new AppError("User not found", 404));
    }
    console.log("✅ User found");

    // Check if email is being updated and if it's already taken
    if (email && email !== user.email) {
      console.log("🔍 Checking if new email is available:", email);
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        console.log("❌ Email already in use:", email);
        return next(new AppError("Email already in use", 400));
      }
      console.log("✅ Email is available");
    }

    // Prepare update data
    const updateData: any = {};

    // Basic Information
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (pin) updateData.pin = pin;
    if (role) updateData.role = role;

    // Balance Information
    if (balance !== undefined) updateData.balance = balance;
    if (availableBalance !== undefined)
      updateData.availableBalance = availableBalance;
    if (currentBalance !== undefined)
      updateData.currentBalance = currentBalance;

    // Verification Status
    if (isEmailVerified !== undefined)
      updateData.isEmailVerified = isEmailVerified;
    if (kycVerified !== undefined) updateData.kycVerified = kycVerified;

    // Balance Visibility Settings
    if (balanceVisibility) {
      updateData.balanceVisibility = {
        available:
          balanceVisibility.available ?? user.balanceVisibility.available,
        current: balanceVisibility.current ?? user.balanceVisibility.current,
      };
    }

    // Personal Information
    if (personalInfo) {
      updateData.personalInfo = {
        phone: personalInfo.phone ?? user.personalInfo?.phone,
        address: personalInfo.address ?? user.personalInfo?.address,
        city: personalInfo.city ?? user.personalInfo?.city,
        state: personalInfo.state ?? user.personalInfo?.state,
        zipCode: personalInfo.zipCode ?? user.personalInfo?.zipCode,
        ssn: personalInfo.ssn ?? user.personalInfo?.ssn,
        driverLicense:
          personalInfo.driverLicense ?? user.personalInfo?.driverLicense,
      };
    }

    // Last Login
    if (lastLogin) updateData.lastLogin = lastLogin;

    console.log(
      "📝 Updating user with data:",
      JSON.stringify(updateData, null, 2)
    );

    // Update user
    user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -pin");

    if (!user) {
      console.log("❌ Failed to update user");
      return next(new AppError("Failed to update user", 500));
    }

    console.log("✅ User updated successfully");

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        balance: user.balance,
        availableBalance: user.availableBalance,
        currentBalance: user.currentBalance,
        accountNumber: user.accountNumber,
        isEmailVerified: user.isEmailVerified,
        kycVerified: user.kycVerified,
        balanceVisibility: user.balanceVisibility,
        personalInfo: user.personalInfo,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  }
);

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  }
);

// @desc    Update profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName, email, pin, balanceVisibility, personalInfo } =
      req.body;
    const userId = (req as any).user._id;

    // Find user by id
    let user = await User.findById(userId);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Update user
    user = await User.findByIdAndUpdate(
      userId,
      {
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        email: email || user.email,
        pin: pin || user.pin,
        balanceVisibility: balanceVisibility || user.balanceVisibility,
        personalInfo: personalInfo || user.personalInfo,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  }
);

// @desc    Verify user PIN
// @route   POST /api/users/verify-pin
// @access  Private
export const verifyPin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { pin } = req.body;
    const userId = (req as any).user._id;

    console.log("pin came in ", pin);
    // Find user by id and select PIN
    const user = await User.findById(userId).select("+pin");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Check if user has a PIN set
    if (!user.pin) {
      return next(new AppError("PIN not set for this user", 400));
    }

    // Compare PIN
    const isPinValid = await user.comparePin(pin);

    console.log(isPinValid);
    res.status(200).json({
      success: true,
      data: {
        isValid: isPinValid,
      },
    });
  }
);

// @desc    Get user balances
// @route   GET /api/users/balances
// @access  Private
export const getUserBalances = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    // Find user by id
    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Get balance visibility settings
    const { available, current } = user.balanceVisibility;

    res.status(200).json({
      success: true,
      data: {
        availableBalance: available ? user.availableBalance : null,
        currentBalance: current ? user.currentBalance : null,
        balanceVisibility: user.balanceVisibility,
      },
    });
  }
);

// @desc    Seed random users
// @route   POST /api/users/seed
// @access  Private/Admin
export const seedUsers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Check if users already exist
    // const existingUsers = await User.find();
    // if (existingUsers.length > 0) {
    //   return next(new AppError("Users already exist in the database", 400));
    // }

    // Create users
    const createdUsers = await User.create(usersData);

    res.status(201).json({
      success: true,
      message: "Users seeded successfully",
      count: createdUsers.length,
      data: createdUsers.map((user) => ({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        accountNumber: user.accountNumber,
      })),
    });
  }
);

// @desc    Get users for transfer
// @route   GET /api/users/transfer-list
// @access  Private
export const getUsersForTransfer = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const users = await User.find()
      .select("firstName lastName accountNumber _id")
      .sort("firstName");

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
    console.log("success");
  }
);

// @desc    Get current user details
// @route   GET /api/users/me
// @access  Private
export const getCurrentUserDetails = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;

    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        balance: user.balance,
        availableBalance: user.availableBalance,
        currentBalance: user.currentBalance,
        accountNumber: user.accountNumber,
        isEmailVerified: user.isEmailVerified,
        kycVerified: user.kycVerified,
        balanceVisibility: user.balanceVisibility,
        personalInfo: user.personalInfo,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  }
);
