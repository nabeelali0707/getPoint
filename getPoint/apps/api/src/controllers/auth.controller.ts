import { z } from "zod";
import type { Request, Response } from "express";
import * as authService from "../services/auth.service.js";
import { HttpError } from "../utils/http-error.js";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");

const studentSignupSchema = z.object({
  email: z.string().email(),
  password: passwordSchema
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6)
});

const resendOtpSchema = z.object({
  email: z.string().email()
});

const driverRegisterSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  fullName: z.string().min(2),
  licenseNo: z.string().min(3),
  vehicleNo: z.string().min(2),
  phone: z.string().min(7),
  requestedPointId: z.string().uuid().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export async function signupStudent(req: Request, res: Response) {
  const result = await authService.signupStudent(studentSignupSchema.parse(req.body));
  res.status(201).json(result);
}

export async function verifyStudentEmail(req: Request, res: Response) {
  const result = await authService.verifyStudentEmail(verifyOtpSchema.parse(req.body));
  res.json(result);
}

export async function resendStudentOtp(req: Request, res: Response) {
  const { email } = resendOtpSchema.parse(req.body);
  const result = await authService.resendStudentOtp(email);
  res.json(result);
}

export async function registerDriver(req: Request, res: Response) {
  const result = await authService.registerDriver(driverRegisterSchema.parse(req.body));
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(loginSchema.parse(req.body));
  res.json(result);
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await authService.refresh(refreshToken);
  res.json({ tokens: result });
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await authService.logout(refreshToken);
  res.json(result);
}

export function requireRefreshToken(req: Request) {
  const { refreshToken } = refreshSchema.parse(req.body);
  if (!refreshToken) {
    throw new HttpError(400, "refreshToken is required.");
  }

  return refreshToken;
}
