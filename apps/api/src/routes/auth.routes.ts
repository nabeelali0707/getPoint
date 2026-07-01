import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const authRouter = Router();

authRouter.post("/students/signup", asyncHandler(authController.signupStudent));
authRouter.post("/students/verify-otp", asyncHandler(authController.verifyStudentEmail));
authRouter.post("/students/resend-otp", asyncHandler(authController.resendStudentOtp));
authRouter.post("/drivers/register", asyncHandler(authController.registerDriver));
authRouter.post("/login", asyncHandler(authController.login));
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.post("/logout", asyncHandler(authController.logout));
