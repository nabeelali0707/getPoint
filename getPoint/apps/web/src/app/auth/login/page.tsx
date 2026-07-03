"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ParticleBackground from "@/components/ParticleBackground";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "driver" | "admin">("student");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const data = await apiFetch<{
        tokens: { accessToken: string; refreshToken: string };
        user: { role: string; email: string };
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Store tokens and user details
      localStorage.setItem("accessToken", data.tokens.accessToken);
      localStorage.setItem("refreshToken", data.tokens.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect based on role
      const userRole = data.user.role;
      if (userRole === "student") {
        router.push("/student/dashboard");
      } else if (userRole === "driver") {
        router.push("/driver/trip");
      } else if (userRole === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to log in.");
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
        <h1 className="flex-1 text-center text-lg font-semibold text-[#dae2fd] pr-10">Welcome Back</h1>
      </header>

      <main className="w-full max-w-md px-6 pt-24 pb-12 flex flex-col min-h-screen relative z-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold text-primary mb-2">GetPoint</h2>
          <p className="text-sm text-[#c2c6d6]">Sign in to track points and manage trips</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          {/* Email Field */}
          <div className="floating-label-group relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">mail</span>
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
              Email Address
            </label>
          </div>

          {/* Password Field */}
          <div className="floating-label-group relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
            <input
              className="w-full bg-glass-surface border border-glass-border rounded-[12px] h-[56px] pl-12 pr-12 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all outline-none"
              id="password"
              placeholder=" "
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {/* Role selector chips (purely visual guidance, backend determines true role) */}
          <div className="space-y-2">
            <span className="text-xs text-[#c2c6d6]">Select Role</span>
            <div className="flex gap-2">
              {(["student", "driver", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold capitalize border transition-all cursor-pointer ${
                    role === r
                      ? "cta-gradient text-white border-transparent"
                      : "bg-glass-surface text-[#c2c6d6] border-glass-border hover:bg-white/5"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            className="cta-gradient w-full h-[56px] rounded-[12px] text-lg font-semibold text-white flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] mt-4 cursor-pointer"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span>Log In</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <footer className="mt-auto pt-12 text-center flex flex-col gap-4">
          <p className="text-sm text-[#c2c6d6]">
            Don't have an account?
            <Link className="text-primary font-bold hover:underline ml-1" href="/auth/student-signup">
              Sign up as Student
            </Link>
          </p>
          <p className="text-xs text-on-surface-variant">
            Driver wanting to join? <Link className="text-primary font-medium hover:underline" href="/auth/driver-register">Register vehicle</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
