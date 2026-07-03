import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  handler: (req, _res, next) => {
    next(new HttpError(429, "Too many login attempts. Please try again in 15 minutes."));
  },
});

const authAbuseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  handler: (req, _res, next) => {
    next(new HttpError(429, "Too many registration or OTP requests. Please try again in 15 minutes."));
  },
});

authRouter.post("/students/signup", authAbuseLimiter, asyncHandler(authController.signupStudent));
authRouter.post("/students/verify-otp", authAbuseLimiter, asyncHandler(authController.verifyStudentEmail));
authRouter.post("/students/resend-otp", authAbuseLimiter, asyncHandler(authController.resendStudentOtp));
authRouter.post("/drivers/register", authAbuseLimiter, asyncHandler(authController.registerDriver));
authRouter.post("/login", loginLimiter, asyncHandler(authController.login));
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.post("/logout", asyncHandler(authController.logout));
