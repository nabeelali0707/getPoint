"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function DriverRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [license, setLicense] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [preferredPoint, setPreferredPoint] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      await apiFetch("/api/auth/drivers/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          fullName,
          licenseNo: license,
          vehicleNo,
          phone,
        }),
      });

      setIsSuccess(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Registration failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center p-6 text-center">
        <div className="glass-card max-w-md w-full rounded-2xl p-8 space-y-6">
          <span className="material-symbols-outlined text-success text-6xl pulse-dot">check_circle</span>
          <h1 className="text-2xl font-bold">Registration Submitted!</h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Your driver application has been successfully submitted. A university transit administrator will review and approve your account. This process usually takes 24-48 hours.
          </p>
          <button
            onClick={() => router.push("/auth/login")}
            className="cta-gradient w-full py-4 rounded-xl text-lg font-semibold text-white active:scale-95 transition-all cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen relative flex flex-col">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full backdrop-blur-md bg-glass-surface border-b border-glass-border shadow-sm z-50 h-16 flex items-center justify-between px-margin-mobile">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/")} className="material-symbols-outlined text-primary cursor-pointer active:scale-95 transition-transform">
            arrow_back
          </button>
          <h1 className="font-headline-md text-headline-md text-primary bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">GetPoint</h1>
        </div>
        <div className="text-sm font-medium text-primary">Driver Portal</div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-20 px-6 max-w-lg mx-auto w-full flex-grow flex flex-col">
        {/* Horizontal Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[#222a3d] -translate-y-1/2 z-0"></div>
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-500"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            ></div>
            
            {/* Step 1 Dot */}
            <div className="relative z-10 flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= 1 ? "bg-primary text-[#002e6a]" : "bg-surface-container-highest text-on-surface-variant"}`}>
                1
              </div>
              <span className={`text-xs font-semibold ${step >= 1 ? "text-primary" : "text-on-surface-variant"}`}>Account</span>
            </div>

            {/* Step 2 Dot */}
            <div className="relative z-10 flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= 2 ? "bg-primary text-[#002e6a]" : "bg-surface-container-highest text-on-surface-variant"}`}>
                2
              </div>
              <span className={`text-xs font-semibold ${step >= 2 ? "text-primary" : "text-on-surface-variant"}`}>Vehicle</span>
            </div>

            {/* Step 3 Dot */}
            <div className="relative z-10 flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= 3 ? "bg-primary text-[#002e6a]" : "bg-surface-container-highest text-on-surface-variant"}`}>
                3
              </div>
              <span className={`text-xs font-semibold ${step >= 3 ? "text-primary" : "text-on-surface-variant"}`}>Review</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="bg-error-container text-on-error-container p-4 rounded-xl border border-error/20 mb-6 flex items-center gap-3 text-sm">
            <span className="material-symbols-outlined text-error">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 flex-grow flex flex-col justify-between">
          {/* STEP 1: Account Info */}
          {step === 1 && (
            <section className="space-y-6 animate-fade-in">
              <div className="glass-card rounded-xl p-6 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-on-surface">Account Credentials</h2>
                  <p className="text-xs text-on-surface-variant">Provide your official details and contact info.</p>
                </div>
                <div className="space-y-6">
                  <div className="relative border-b-2 border-glass-border focus-within:border-primary py-2 transition-all">
                    <input
                      className="w-full bg-transparent outline-none text-on-surface"
                      id="full-name"
                      placeholder="Full Name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="relative border-b-2 border-glass-border focus-within:border-primary py-2 transition-all">
                    <input
                      className="w-full bg-transparent outline-none text-on-surface"
                      id="email"
                      placeholder="University Email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="relative border-b-2 border-glass-border focus-within:border-primary py-2 transition-all">
                    <input
                      className="w-full bg-transparent outline-none text-on-surface"
                      id="phone"
                      placeholder="Phone Number"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="relative border-b-2 border-glass-border focus-within:border-primary py-2 transition-all">
                    <input
                      className="w-full bg-transparent outline-none text-on-surface"
                      id="password"
                      placeholder="Password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* STEP 2: Vehicle Info */}
          {step === 2 && (
            <section className="space-y-6 animate-fade-in">
              <div className="glass-card rounded-xl p-6 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-on-surface">Vehicle & Transit Details</h2>
                  <p className="text-xs text-on-surface-variant">Register your vehicle to the university fleet.</p>
                </div>
                <div className="space-y-6">
                  <div className="relative border-b-2 border-glass-border focus-within:border-primary py-2 transition-all">
                    <input
                      className="w-full bg-transparent outline-none text-on-surface"
                      id="license"
                      placeholder="Driver License ID"
                      type="text"
                      required
                      value={license}
                      onChange={(e) => setLicense(e.target.value)}
                    />
                  </div>
                  <div className="relative border-b-2 border-glass-border focus-within:border-primary py-2 transition-all">
                    <input
                      className="w-full bg-transparent outline-none text-on-surface"
                      id="vehicle-number"
                      placeholder="Bus/Vehicle Number"
                      type="text"
                      required
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value)}
                    />
                  </div>
                  <div className="relative space-y-2">
                    <label className="block text-xs font-semibold text-on-surface-variant" htmlFor="preferred-point">Preferred Hub / Point</label>
                    <select
                      className="w-full bg-surface-container-low border border-glass-border rounded-lg px-4 py-2.5 text-on-surface outline-none focus:border-primary transition-colors cursor-pointer"
                      id="preferred-point"
                      value={preferredPoint}
                      onChange={(e) => setPreferredPoint(e.target.value)}
                    >
                      <option value="">Select a Transit Point</option>
                      <option value="North Campus Terminal">North Campus Terminal</option>
                      <option value="South Gateway Hub">South Gateway Hub</option>
                      <option value="Engineering Quad Point">Engineering Quad Point</option>
                      <option value="Medical Center Plaza">Medical Center Plaza</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <section className="space-y-6 animate-fade-in">
              <div className="bg-warning/20 border border-warning/30 rounded-xl p-4 flex gap-4 items-start">
                <span className="material-symbols-outlined text-warning">report_problem</span>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-warning">Pending Admin Approval</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    After submission, your account will be locked until a University Transit Admin verifies your credentials.
                  </p>
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 space-y-6 relative overflow-hidden">
                <h2 className="text-lg font-semibold text-on-surface">Application Summary</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Driver Identity</p>
                    <p className="text-lg font-bold text-on-surface">{fullName}</p>
                    <p className="text-sm text-on-surface-variant">{email}</p>
                    <p className="text-sm text-on-surface-variant">{phone}</p>
                  </div>
                  <div className="border-t border-glass-border pt-4">
                    <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Fleet Information</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-on-surface-variant">Vehicle #</p>
                        <p className="text-sm font-bold text-on-surface">{vehicleNo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant">Hub</p>
                        <p className="text-sm font-bold text-on-surface">{preferredPoint || "None preferred"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 mt-auto">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="text-sm px-6 py-2.5 rounded-lg border border-glass-border text-on-surface-variant hover:bg-white/5 transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span> Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="text-sm px-8 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-on-primary font-bold shadow-[0_0_20px_rgba(173,198,255,0.3)] hover:shadow-[0_0_30px_rgba(173,198,255,0.5)] transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                Next <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="text-sm px-8 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-[#002e6a] font-bold shadow-[0_0_20px_rgba(173,198,255,0.3)] hover:shadow-[0_0_30px_rgba(173,198,255,0.5)] transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Submit Application <span className="material-symbols-outlined text-sm">send</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        <p className="text-center text-xs text-on-surface-variant mt-8">
          Already registered? <Link href="/auth/login" className="text-primary hover:underline font-bold">Log in here</Link>
        </p>
      </main>
    </div>
  );
}
