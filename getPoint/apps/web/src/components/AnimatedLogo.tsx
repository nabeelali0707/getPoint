import React from "react";

export default function AnimatedLogo({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg fill="none" viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="pinGradient" x1="100" x2="100" y1="40" y2="160">
            <stop stopColor="#3B82F6"></stop>
            <stop offset="1" stopColor="#8B5CF6"></stop>
          </linearGradient>
          <filter filterUnits="userSpaceOnUse" height="200" id="glow" width="200" x="0" y="0">
            <feGaussianBlur result="blur" stdDeviation="8"></feGaussianBlur>
            <feComposite in="SourceGraphic" in2="blur" operator="over"></feComposite>
          </filter>
        </defs>
        {/* Outer Pulsing Glow */}
        <circle cx="100" cy="100" fill="url(#pinGradient)" opacity="0.15" r="70">
          <animate attributeName="r" dur="3s" repeatCount="indefinite" values="60;85;60"></animate>
          <animate attributeName="opacity" dur="3s" repeatCount="indefinite" values="0.15;0.3;0.15"></animate>
        </circle>
        {/* Location Pin Shape */}
        <path d="M100 160C100 160 145 115 145 80C145 55.1472 124.853 35 100 35C75.1472 35 55 55.1472 55 80C55 115 100 160 100 160Z" fill="url(#pinGradient)" filter="url(#glow)"></path>
        {/* Inner Circle (Hole) */}
        <circle cx="100" cy="80" fill="#0F172A" r="18"></circle>
        {/* Inner Point Dot */}
        <circle cx="100" cy="80" fill="url(#pinGradient)" r="8">
          <animate attributeName="r" dur="2s" repeatCount="indefinite" values="6;10;6"></animate>
        </circle>
      </svg>
    </div>
  );
}
