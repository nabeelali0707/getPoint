import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const hasSmtpConfig = Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT!,
      auth: {
        user: env.SMTP_USER!,
        pass: env.SMTP_PASS!
      }
    })
  : null;

export async function sendOtpEmail(email: string, otp: string) {
  if (!transporter) {
    console.info(`[dev-email] OTP for ${email}: ${otp}`);
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "Your Point Management System OTP",
    text: `Your OTP is ${otp}. It expires in ${Math.floor(env.OTP_TTL_SECONDS / 60)} minutes.`
  });
}
