import React from "react";

export default function AnimatedMail({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg fill="none" viewBox="0 0 64 64" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="mailGradient" x1="32" x2="32" y1="16" y2="48">
            <stop stopColor="#3B82F6"></stop>
            <stop offset="1" stopColor="#8B5CF6"></stop>
          </linearGradient>
        </defs>
        <path d="M52 16H12C9.79086 16 8 17.7909 8 20V44C8 46.2091 9.79086 48 12 48H52C54.2091 48 56 46.2091 56 44V20C56 17.7909 54.2091 16 52 16Z" stroke="url(#mailGradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
        <path d="M8 20L32 34L56 20" stroke="url(#mailGradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
        <animateTransform attributeName="transform" dur="4s" repeatCount="indefinite" type="translate" values="0,0; 0,-8; 0,0"></animateTransform>
      </svg>
    </div>
  );
}
