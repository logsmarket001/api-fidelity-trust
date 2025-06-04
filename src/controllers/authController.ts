import type { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import User, { UserRole } from "../models/User";
import config from "../config/config";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";

// Generate JWT token
const generateToken = (id: string): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign({ id }, config.jwt.secret, options);
};

// Generate refresh token
const generateRefreshToken = (id: string): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign({ id }, config.jwt.refreshSecret, options);
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      firstName,
      lastName,
      email,
      password,
      pin,
      personalInfo,
      role,
      balance,
      availableBalance,
      currentBalance,
      isEmailVerified,
      kycVerified,
      balanceVisibility,
    } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError("User already exists", 400));
    }

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      pin,
      personalInfo,
      role: role || UserRole.USER,
      balance: balance || 0,
      availableBalance: availableBalance || 0,
      currentBalance: currentBalance || 0,
      isEmailVerified: isEmailVerified || false,
      kycVerified: kycVerified || false,
      balanceVisibility: balanceVisibility || {
        available: true,
        current: true,
      },
      lastLogin: new Date(),
    });

    if (user) {
      // Generate tokens
      const token = generateToken(user._id.toString());
      const refreshToken = generateRefreshToken(user._id.toString());

      res.status(201).json({
        success: true,
        data: {
          token,
          refreshToken,
          user: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role === UserRole.USER ? "customer" : "admin",
            balance: user.balance,
            availableBalance: user.availableBalance,
            currentBalance: user.currentBalance,
            accountNumber: user.accountNumber,
            isEmailVerified: user.isEmailVerified,
            kycVerified: user.kycVerified,
            balanceVisibility: user.balanceVisibility,
            personalInfo: user.personalInfo,
            lastLogin: user.lastLogin,
          },
        },
      });
    } else {
      return next(new AppError("Invalid user data", 400));
    }
  }
);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }

    // Find user by email
    const user = await User.findOne({ email }).select("+password");

    // Check if user exists and password is correct
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError("Invalid credentials", 401));
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    res.status(200).json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role === UserRole.USER ? "customer" : "admin",
          balance: user.balance,
          availableBalance: user.availableBalance,
          currentBalance: user.currentBalance,
          accountNumber: user.accountNumber,
          isEmailVerified: user.isEmailVerified,
          kycVerified: user.kycVerified,
          balanceVisibility: user.balanceVisibility,
          personalInfo: user.personalInfo,
          lastLogin: user.lastLogin,
        },
      },
    });
  }
);

// @desc    Admin login
// @route   POST /api/auth/admin-login
// @access  Public
export const adminLogin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }

    // Find admin by email
    const admin = await User.findOne({ email, role: UserRole.ADMIN }).select(
      "+password"
    );

    // Check if admin exists and password is correct
    if (!admin || !(await admin.comparePassword(password))) {
      return next(new AppError("Invalid admin credentials", 401));
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate tokens
    const token = generateToken(admin._id.toString());
    const refreshToken = generateRefreshToken(admin._id.toString());
console.log("this wen theroug",email,password)
   return res.status(200).json({
      success: true,
      data: {
        _id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
        token,
        refreshToken,
      },
    });
  }
);

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError("Refresh token is required", 400));
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as {
        id: string;
      };

      // Find user by id
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new AppError("Invalid refresh token", 401));
      }

      // Generate new tokens
      const newToken = generateToken(user._id.toString());
      const newRefreshToken = generateRefreshToken(user._id.toString());

      res.status(200).json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      return next(new AppError("Invalid refresh token", 401));
    }
  }
);

// @desc    Update user information
// @route   PUT /api/auth/update-info
// @access  Private
export const updateUserInfo = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user._id;
    const { firstName, lastName, email, phone } = req.body;

    // Find user by id
    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Check if email is being updated and if it's already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return next(new AppError("Email already in use", 400));
      }
    }

    // Update fields if they exist in request
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        balance: user.balance,
        accountNumber: user.accountNumber,
        isEmailVerified: user.isEmailVerified,
        kycVerified: user.kycVerified,
        balanceVisibility: user.balanceVisibility,
        personalInfo: user.personalInfo,
        lastLogin: user.lastLogin,
      },
    });
  }
);

// @desc    Change PIN
// @route   PUT /api/auth/change-pin
// @access  Private
export const changePin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { currentPin, newPin } = req.body;
    const userId = (req as any).user._id;

    if (!currentPin || !newPin) {
      return next(new AppError("Current PIN and new PIN are required", 400));
    }

    // Find user by id and select PIN
    const user = await User.findById(userId).select("+pin");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Check if user has a PIN set
    if (!user.pin) {
      return next(new AppError("No PIN set for this account", 400));
    }

    // Verify current PIN
    const isPinValid = await user.comparePin(currentPin);
    if (!isPinValid) {
      return next(new AppError("Current PIN is incorrect", 401));
    }

    // Update PIN
    user.pin = newPin;
    await user.save();

    res.status(200).json({
      success: true,
      message: "PIN changed successfully",
    });
  }
);

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user._id;

    if (!currentPassword || !newPassword) {
      return next(
        new AppError("Current password and new password are required", 400)
      );
    }

    // Find user by id and select password
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Check if current password is correct
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return next(new AppError("Current password is incorrect", 401));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  }
);

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // In a real application, you would:
    // 1. Generate a reset token
    // 2. Save it to the user document with an expiry
    // 3. Send an email with a reset link

    // For this implementation, we'll just return a success message
    res.status(200).json({
      success: true,
      message: "Password reset email sent",
    });
  }
);

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token, password } = req.body;

    // In a real application, you would:
    // 1. Verify the reset token
    // 2. Check if it's expired
    // 3. Update the user's password

    // For this implementation, we'll just return a success message
    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  }
);

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;

    // In a real application, you would:
    // 1. Verify the email verification token
    // 2. Update the user's email verification status

    // For this implementation, we'll just return a success message
    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  }
);

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = asyncHandler(
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
        accountNumber: user.accountNumber,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    });
  }
);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // In a real application with refresh tokens stored in DB, you would:
    // 1. Invalidate the refresh token in the database

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }
);

// @desc    Seed admin user
// @route   POST /api/auth/seed-admin
// @access  Public
export const seedAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Check if admin already exists
    const adminExists = await User.findOne({
      email: "admin@fidelitytrust.com",
    });
    if (adminExists) {
      return next(new AppError("Admin user already exists", 400));
    }

    // Create admin user
    const admin = await User.create({
      firstName: "Admin",
      lastName: "User",
      email: "admin@fidelitytrust.com",
      password: "admin123",
      role: UserRole.ADMIN,
      isEmailVerified: true,
      kycVerified: true,
      balance: 0,
      availableBalance: 0,
      currentBalance: 0,
      balanceVisibility: {
        available: true,
        current: true,
      },
      personalInfo: {
        phone: "1234567890",
        address: "Admin Address",
        city: "Admin City",
        state: "Admin State",
        zipCode: "12345",
      },
      lastLogin: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Admin user created successfully",
      data: {
        _id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
        accountNumber: admin.accountNumber,
      },
    });
  }
);
