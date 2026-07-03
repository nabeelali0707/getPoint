"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ParticleBackground from "@/components/ParticleBackground";
import { apiFetch } from "@/lib/api";

export default function StudentSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState({ score: 0, text: "Enter a password", color: "bg-outline" });
  const [match, setMatch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const checkStrength = (val: string) => {
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[a-z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    let text = "Weak";
    let color = "bg-error";

    if (val.length === 0) {
      text = "Enter a password";
      color = "bg-outline";
      score = 0;
    } else if (score >= 4) {
      text = "Strong";
      color = "bg-success";
    } else if (score >= 2) {
      text = "Medium";
      color = "bg-warning";
    }

    setStrength({ score, text, color });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    checkStrength(val);
    setMatch(val === confirmPassword && val !== "");
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setConfirmPassword(val);
    setMatch(password === val && val !== "");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setErrorMsg("");
    setIsLoading(true);

    try {
      await apiFetch("/api/auth/students/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Store email in sessionStorage to pass to verify-otp
      sessionStorage.setItem("signup_email", email);
      router.push("/auth/verify-otp");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
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

      {/* Navigation Header */}
      <header className="w-full max-w-md h-16 flex items-center px-4 fixed top-0 bg-[#0b1326]/80 backdrop-blur-md z-50">
        <button
          onClick={() => router.push("/")}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[#dae2fd]">arrow_back</span>
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-[#dae2fd] pr-10">Create Account</h1>
      </header>

      <main className="w-full max-w-md px-6 pt-24 pb-12 flex flex-col min-h-screen relative z-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-primary mb-2">Join GetPoint</h2>
          <p className="text-sm text-[#c2c6d6]">Real-time campus transit at your fingertips.</p>
        </div>

        {/* Signup Form */}
        <form className="flex flex-col gap-6" onSubmit={handleSignup}>
          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <div className="floating-label-group relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">school</span>
              <input
                className="w-full bg-glass-surface border border-glass-border rounded-[12px] h-[56px] pl-12 pr-4 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                id="email"
                placeholder=" "
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label className="text-sm text-outline absolute left-12 top-4 pointer-events-none transition-all duration-200" htmlFor="email">
                NU Email
              </label>
            </div>
            <p className="text-xs text-[#424754] px-1">
              Must be your official NU email (format: k######@nu.edu.pk)
            </p>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-2">
            <div className="floating-label-group relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
              <input
                className="w-full bg-glass-surface border border-glass-border rounded-[12px] h-[56px] pl-12 pr-12 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                id="password"
                placeholder=" "
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
              />
              <label className="text-sm text-outline absolute left-12 top-4 pointer-events-none transition-all duration-200" htmlFor="password">
                Password
              </label>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
                type="button"
              >
                <span className="material-symbols-outlined">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {/* Strength Indicator */}
            <div className="flex flex-col gap-1 px-1">
              <div className="w-full h-1 bg-[#171f33] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${strength.color}`}
                  style={{ width: `${(strength.score / 5) * 100}%` }}
                ></div>
              </div>
              <span className="text-xs text-[#424754]">{strength.text}</span>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="floating-label-group relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock_reset</span>
            <input
              className="w-full bg-glass-surface border border-glass-border rounded-[12px] h-[56px] pl-12 pr-12 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all outline-none"
              id="confirmPassword"
              placeholder=" "
              required
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
            />
            <label className="text-sm text-outline absolute left-12 top-4 pointer-events-none transition-all duration-200" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${match ? "text-success" : "text-[#424754]"}`}>
              <span className="material-symbols-outlined">check_circle</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            className="cta-gradient w-full h-[56px] rounded-[12px] text-lg font-semibold text-white flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] mt-4 cursor-pointer"
            id="submitBtn"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span>Sign Up</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <footer className="mt-auto pt-12 text-center">
          <p className="text-sm text-[#c2c6d6]">
            Already have an account?
            <Link className="text-primary font-bold hover:underline ml-1" href="/auth/login">
              Log in
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
