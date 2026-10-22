"use client";

import { useState, useEffect, useRef } from "react";

export default function ScalesOfJustice() {
  const [tilt, setTilt] = useState(0); // in degrees
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dx = e.clientX - centerX;
      // Calculate tilt based on mouse offset, capped at ±12 degrees
      const maxTilt = 12;
      const calculatedTilt = Math.min(
        Math.max((dx / (rect.width / 2)) * maxTilt, -maxTilt),
        maxTilt
      );
      setTilt(calculatedTilt);
    };

    const handleMouseLeave = () => {
      // Return to horizontal balance slowly with an oscillation
      let count = 0;
      const interval = setInterval(() => {
        setTilt((prev) => {
          if (Math.abs(prev) < 0.1) {
            clearInterval(interval);
            return 0;
          }
          return -prev * 0.7; // Dampened oscillation bounce
        });
        count++;
        if (count > 15) {
          clearInterval(interval);
          setTilt(0);
        }
      }, 80);
      return () => clearInterval(interval);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, []);

  // Calculate pan movements: one goes down, other goes up
  const leftPanY = tilt * 1.5;
  const rightPanY = -tilt * 1.5;

  return (
    <div
      ref={containerRef}
      id="scales-container"
      className="relative w-full max-w-[260px] sm:max-w-[300px] aspect-square flex items-center justify-center cursor-pointer select-none transition-all duration-300"
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bronzeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8f7243" />
            <stop offset="50%" stopColor="#b89862" />
            <stop offset="100%" stopColor="#715732" />
          </linearGradient>
          <linearGradient id="slateGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>

        {/* Central Stand / Pillar */}
        {/* Base */}
        <path
          d="M 60 170 L 140 170 L 130 160 L 70 160 Z"
          fill="url(#bronzeGradient)"
        />
        <rect x="75" y="152" width="50" height="8" rx="2" fill="url(#bronzeGradient)" />
        {/* Pillar Shaft */}
        <rect x="96" y="55" width="8" height="97" fill="url(#bronzeGradient)" />
        {/* Decorative elements on Pillar */}
        <circle cx="100" cy="85" r="6" fill="none" stroke="url(#bronzeGradient)" strokeWidth="1.5" />
        <circle cx="100" cy="120" r="6" fill="none" stroke="url(#bronzeGradient)" strokeWidth="1.5" />
        {/* Pillar Cap */}
        <path
          d="M 90 55 L 110 55 L 100 40 Z"
          fill="url(#bronzeGradient)"
        />
        <circle cx="100" cy="38" r="4" fill="url(#bronzeGradient)" />

        {/* --- Rotating Beam --- */}
        <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: "100px 58px", transition: "transform 0.15s ease-out" }}>
          {/* Main Beam */}
          <path
            d="M 30 58 C 30 58, 65 54, 100 58 C 135 54, 170 58, 170 58 L 170 60 C 170 60, 135 56, 100 60 C 65 56, 30 60, 30 60 Z"
            fill="url(#bronzeGradient)"
          />
          {/* Center Hinge Pin */}
          <circle cx="100" cy="58" r="3.5" fill="#0f1e36" stroke="url(#bronzeGradient)" strokeWidth="1.5" />
          
          {/* Left Hook */}
          <circle cx="32" cy="59" r="2.5" fill="url(#bronzeGradient)" />
          {/* Right Hook */}
          <circle cx="168" cy="59" r="2.5" fill="url(#bronzeGradient)" />
        </g>

        {/* --- Left Pan --- */}
        <g style={{ transform: `translateY(${leftPanY}px)`, transition: "transform 0.15s ease-out" }}>
          <line x1="32" y1="59" x2="16" y2="120" stroke="url(#bronzeGradient)" strokeWidth="1" opacity="0.7" />
          <line x1="32" y1="59" x2="48" y2="120" stroke="url(#bronzeGradient)" strokeWidth="1" opacity="0.7" />
          <line x1="32" y1="59" x2="32" y2="120" stroke="url(#bronzeGradient)" strokeWidth="0.8" opacity="0.4" />
          
          {/* Left Pan Plate */}
          <path d="M 12 120 C 12 120, 12 128, 32 128 C 52 128, 52 120, 52 120 Z" fill="url(#bronzeGradient)" />
          <path d="M 16 120 L 48 120" stroke="url(#bronzeGradient)" strokeWidth="2" strokeLinecap="round" />
          
          {/* Weights */}
          <circle cx="32" cy="115" r="4" fill="url(#slateGradient)" />
          <circle cx="27" cy="117" r="3" fill="url(#slateGradient)" />
        </g>

        {/* --- Right Pan --- */}
        <g style={{ transform: `translateY(${rightPanY}px)`, transition: "transform 0.15s ease-out" }}>
          <line x1="168" y1="59" x2="152" y2="120" stroke="url(#bronzeGradient)" strokeWidth="1" opacity="0.7" />
          <line x1="168" y1="59" x2="184" y2="120" stroke="url(#bronzeGradient)" strokeWidth="1" opacity="0.7" />
          <line x1="168" y1="59" x2="168" y2="120" stroke="url(#bronzeGradient)" strokeWidth="0.8" opacity="0.4" />

          {/* Right Pan Plate */}
          <path d="M 148 120 C 148 120, 148 128, 168 128 C 188 128, 188 120, 188 120 Z" fill="url(#bronzeGradient)" />
          <path d="M 152 120 L 184 120" stroke="url(#bronzeGradient)" strokeWidth="2" strokeLinecap="round" />
          
          {/* Weights */}
          <circle cx="168" cy="115" r="4" fill="url(#slateGradient)" />
          <circle cx="173" cy="117" r="3" fill="url(#slateGradient)" />
        </g>

        {/* Emblem on center post */}
        <g transform="translate(90, 95)">
          <rect width="20" height="20" rx="3" fill="#0f1e36" stroke="url(#bronzeGradient)" strokeWidth="1" />
          <text x="5" y="14" fill="#b89862" fontSize="8" fontWeight="bold" fontFamily="sans-serif">NF</text>
        </g>
      </svg>
    </div>
  );
}
