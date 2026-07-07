"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ParticleBackground from "@/components/ParticleBackground";
import AnimatedMail from "@/components/AnimatedMail";
import { apiFetch } from "@/lib/api";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    // Get signup email from sessionStorage
    const storedEmail = sessionStorage.getItem("signup_email") || "your NU email";
    setEmail(storedEmail);
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit code.");
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      await apiFetch("/api/auth/students/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp: otpValue }),
      });

      setSuccessMsg("Email verified successfully! Redirecting...");
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to verify OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      await apiFetch("/api/auth/students/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setSuccessMsg("A fresh OTP has been sent.");
      setTimer(60);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to resend OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center text-[#dae2fd] overflow-hidden relative">
      <ParticleBackground />

      {/* Error Toast */}
      {errorMsg && (
        <div className="fixed top-4 left-4 right-4 z-[100] transition-all duration-300">
          <div className="bg-error-container text-on-error-container p-4 rounded-xl flex items-center justify-between shadow-2xl border border-error/20 glass-surface backdrop-blur-xl max-w-md mx-auto animate-pulse-error">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-error">error</span>
              <span className="text-sm font-medium">{errorMsg}</span>
            </div>
            <button
              className="hover:bg-white/10 p-1 rounded-full transition-colors cursor-pointer"
              onClick={() => setErrorMsg("")}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed top-4 left-4 right-4 z-[100] transition-all duration-300">
          <div className="bg-success/20 text-[#22C55E] p-4 rounded-xl flex items-center justify-between shadow-2xl border border-success/30 glass-surface backdrop-blur-xl max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-success">check_circle</span>
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
            <button
              className="hover:bg-white/10 p-1 rounded-full transition-colors cursor-pointer"
              onClick={() => setSuccessMsg("")}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      <header className="w-full max-w-md h-16 flex items-center px-4 fixed top-0 bg-[#0b1326]/80 backdrop-blur-md z-50">
        <button
          onClick={() => router.push("/auth/student-signup")}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[#dae2fd]">arrow_back</span>
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-[#dae2fd] pr-10">Verify Email</h1>
      </header>

      <main className="w-full max-w-md px-6 pt-28 pb-12 flex flex-col items-center justify-center min-h-screen relative z-10 text-center">
        <AnimatedMail className="w-24 h-24 mb-6" />

        <h2 className="text-2xl font-bold mb-2">Check your NU email</h2>
        <p className="text-sm text-[#c2c6d6] mb-8 max-w-[280px]">
          We&apos;ve sent a 6-digit verification code to <span className="text-primary font-medium block mt-1">{email}</span>
        </p>

        <form onSubmit={handleVerify} className="w-full flex flex-col items-center gap-8">
          {/* OTP Digit Inputs */}
          <div className="flex gap-2 justify-center w-full max-w-sm">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-xl font-bold bg-glass-surface border border-glass-border rounded-xl text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all outline-none"
              />
            ))}
          </div>

          <div className="flex flex-col gap-4 w-full">
            <button
              className="cta-gradient w-full h-[56px] rounded-[12px] text-lg font-semibold text-white flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] cursor-pointer"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span>Verify</span>
              )}
            </button>

            {timer > 0 ? (
              <p className="text-xs text-[#424754]">
                Resend code in <span className="text-primary font-medium">{timer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Resend OTP
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
