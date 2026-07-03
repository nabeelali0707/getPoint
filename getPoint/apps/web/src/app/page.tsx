"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AnimatedLogo from "@/components/AnimatedLogo";
import ParticleBackground from "@/components/ParticleBackground";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between p-6 text-[#dae2fd] overflow-hidden">
      <ParticleBackground />

      <main className="relative z-10 w-full max-w-[375px] flex flex-col items-center justify-center flex-grow py-12">
        {/* Logo Header */}
        <div className="mb-6 flex flex-col items-center">
          <div className="w-32 h-32 flex items-center justify-center pulse-glow">
            <AnimatedLogo />
          </div>
        </div>

        {/* Hero Text */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold mb-2 tracking-tight">
            <span className="gradient-text">GetPoint</span>
          </h1>
          <p className="text-lg text-[#c2c6d6] max-w-[280px] mx-auto">
            Track your university shuttle in real-time
          </p>
        </div>

        {/* Call to Action Container */}
        <div className="w-full space-y-4 px-4">
          {/* Student CTA */}
          <button
            onClick={() => router.push("/auth/student-signup")}
            className="cta-gradient w-full py-4 px-6 rounded-xl flex items-center justify-center gap-2 text-xl font-semibold text-white active:scale-95 transition-transform ease-out duration-200 cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              book
            </span>
            <span>I'm a Student</span>
          </button>

          {/* Driver CTA */}
          <button
            onClick={() => router.push("/auth/driver-register")}
            className="glass-card w-full py-4 px-6 rounded-xl flex items-center justify-center gap-2 text-xl font-semibold text-[#dae2fd] border border-[rgba(255,255,255,0.1)] hover:bg-white/10 active:scale-95 transition-all ease-out duration-200 cursor-pointer"
          >
            <span className="material-symbols-outlined">directions_car</span>
            <span>I'm a Driver</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-6 flex justify-center">
        <Link
          href="/auth/login"
          className="text-xs font-semibold tracking-wider text-[#64748B] hover:text-[#adc6ff] transition-colors flex items-center gap-1"
        >
          Admin Login <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </footer>
    </div>
  );
}
