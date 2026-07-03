import crypto from "node:crypto";
import { env } from "../config/env.js";
import { redis } from "./redis.service.js";
import { sendOtpEmail } from "./mail.service.js";

function otpKey(email: string) {
  return `otp:${email.toLowerCase()}`;
}

export async function createAndSendOtp(email: string) {
  const otp = crypto.randomInt(100000, 999999).toString();
  await redis.set(otpKey(email), otp, "EX", env.OTP_TTL_SECONDS);
  await sendOtpEmail(email, otp);
}

export async function verifyOtp(email: string, otp: string) {
  const key = otpKey(email);
  const storedOtp = await redis.get(key);

  if (!storedOtp || storedOtp !== otp) {
    return false;
  }

  await redis.del(key);
  return true;
}
