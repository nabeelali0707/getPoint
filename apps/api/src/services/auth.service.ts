import bcrypt from "bcryptjs";
import type { DriverRegisterDto, LoginDto, StudentSignupDto, VerifyOtpDto } from "@point/shared-types";
import { Prisma, type User } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../utils/http-error.js";
import { assertNuEmail, nuIdFromEmail } from "../utils/nu-email.js";
import { createAndSendOtp, verifyOtp } from "./otp.service.js";
import { issueTokens, rotateRefreshToken, revokeRefreshToken } from "./token.service.js";

function publicUser(user: User) {
  return {
    id: user.id,
    role: user.role,
    email: user.email,
    status: user.status,
    emailVerified: user.emailVerified
  };
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapUniqueError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new HttpError(409, "An account with this unique identifier already exists.");
  }

  throw error;
}

export async function signupStudent(input: StudentSignupDto) {
  const email = normalizeEmail(input.email);

  try {
    assertNuEmail(email);
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "Invalid NU email.");
  }

  try {
    const user = await prisma.user.create({
      data: {
        role: "student",
        email,
        passwordHash: await hashPassword(input.password),
        studentProfile: {
          create: {
            nuId: nuIdFromEmail(email)
          }
        }
      }
    });

    await createAndSendOtp(email);
    return { user: publicUser(user), message: "Student account created. Check your NU email for the OTP." };
  } catch (error) {
    mapUniqueError(error);
  }
}

export async function verifyStudentEmail(input: VerifyOtpDto) {
  const email = normalizeEmail(input.email);
  const isValid = await verifyOtp(email, input.otp);

  if (!isValid) {
    throw new HttpError(400, "OTP is invalid or expired.");
  }

  const user = await prisma.user.update({
    where: { email },
    data: { emailVerified: true }
  });

  return { user: publicUser(user), message: "Email verified successfully." };
}

export async function resendStudentOtp(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.role !== "student") {
    throw new HttpError(404, "Student account not found.");
  }

  if (user.emailVerified) {
    throw new HttpError(409, "Email is already verified.");
  }

  await createAndSendOtp(email);
  return { message: "A fresh OTP has been sent." };
}

export async function registerDriver(input: DriverRegisterDto) {
  const email = normalizeEmail(input.email);

  try {
    const user = await prisma.user.create({
      data: {
        role: "driver",
        email,
        passwordHash: await hashPassword(input.password),
        driverProfile: {
          create: {
            fullName: input.fullName.trim(),
            licenseNo: input.licenseNo.trim(),
            vehicleNo: input.vehicleNo.trim(),
            phone: input.phone.trim(),
            assignedPointId: input.requestedPointId
          }
        }
      },
      include: { driverProfile: true }
    });

    return {
      user: publicUser(user),
      driverProfile: user.driverProfile,
      message: "Driver registration submitted. You can log in after admin approval."
    };
  } catch (error) {
    mapUniqueError(error);
  }
}

export async function login(input: LoginDto) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { driverProfile: true }
  });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password.");
  }

  if (user.status !== "active") {
    throw new HttpError(403, "This account is suspended.");
  }

  if (user.role === "student" && !user.emailVerified) {
    throw new HttpError(403, "Verify your NU email before logging in.");
  }

  if (user.role === "driver" && user.driverProfile?.approvalStatus !== "approved") {
    throw new HttpError(403, "Driver account is not approved yet.", {
      approvalStatus: user.driverProfile?.approvalStatus,
      rejectionReason: user.driverProfile?.rejectionReason
    });
  }

  const tokens = await issueTokens({
    sub: user.id,
    role: user.role,
    email: user.email
  });

  return { user: publicUser(user), tokens };
}

export async function refresh(refreshToken: string) {
  return rotateRefreshToken(refreshToken);
}

export async function logout(refreshToken: string) {
  await revokeRefreshToken(refreshToken);
  return { message: "Logged out successfully." };
}
