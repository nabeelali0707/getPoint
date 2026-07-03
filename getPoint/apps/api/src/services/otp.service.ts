import crypto from "node:crypto";
import { env } from "../config/env.js";
import {
  deleteEphemeralState,
  getEphemeralState,
  setEphemeralState,
  updateEphemeralStateValue,
} from "./ephemeral-store.service.js";
import { sendOtpEmail } from "./mail.service.js";

type OtpState = {
  code: string;
  attempts: number;
};

function otpKey(email: string) {
  return `otp:${email.toLowerCase()}`;
}

export async function createAndSendOtp(email: string) {
  const otp = crypto.randomInt(100000, 999999).toString();
  await setEphemeralState(otpKey(email), { code: otp, attempts: 0 }, env.OTP_TTL_SECONDS);
  await sendOtpEmail(email, otp);
}

export async function verifyOtp(email: string, otp: string) {
  const key = otpKey(email);
  const storedOtp = await getEphemeralState<OtpState>(key);

  if (!storedOtp || storedOtp.code !== otp) {
    if (storedOtp) {
      await updateEphemeralStateValue(key, { ...storedOtp, attempts: storedOtp.attempts + 1 });
    }
    return false;
  }

  await deleteEphemeralState(key);
  return true;
}
