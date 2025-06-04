import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { UserRole } from "../models/User";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import config from "../config/config";

// Protect routes
export const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }
    console.log(authHeader);
    const token = authHeader.split(" ")[1];
    console.log(token);
    // Check if token exists
    if (!token) {
      return next(new AppError("Not authorized to access this route", 401));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret) as { id: string };

      // Get user from token
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new AppError("User not found", 404));
      }
      // Add user to request
      (req as any).user = user;
      next();
    } catch (error) {
      return next(new AppError("Not authorized to access this route", 401));
    }
  }
);

// Admin middleware
export const admin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if ((req as any).user && (req as any).user.role === UserRole.ADMIN) {
      next();
    } else {
      return next(new AppError("Not authorized as an admin", 403));
    }
  }
);
