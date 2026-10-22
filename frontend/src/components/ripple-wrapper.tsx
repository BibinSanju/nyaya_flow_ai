"use client";

import React, { useState, useLayoutEffect } from "react";

interface Ripple {
  key: number;
  x: number;
  y: number;
  size: number;
}

export default function RippleWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const addRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const newRipple = {
      key: Date.now() + Math.random(),
      x,
      y,
      size,
    };

    setRipples((prev) => [...prev, newRipple]);
  };

  useLayoutEffect(() => {
    if (ripples.length > 0) {
      const timer = setTimeout(() => {
        setRipples((prev) => prev.slice(1));
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [ripples]);

  return (
    <div onClick={addRipple} className={`relative overflow-hidden select-none ${className}`}>
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.key}
          className="absolute rounded-full bg-white/20 pointer-events-none animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
    </div>
  );
}
