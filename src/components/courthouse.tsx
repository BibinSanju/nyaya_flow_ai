"use client";

import { motion } from "framer-motion";

export default function CourthouseComponent() {
  return (
    <div
      id="courthouse-container"
      className="relative w-full max-w-[260px] sm:max-w-[300px] aspect-square flex items-center justify-center p-4 transition-all duration-300"
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="metalBrass" x1="0%" y1="0%" x2="1" y2="1">
            <stop offset="0%" stopColor="#8f7243" />
            <stop offset="50%" stopColor="#b89862" />
            <stop offset="100%" stopColor="#715732" />
          </linearGradient>
        </defs>

        {/* Foundation steps */}
        <motion.g 
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ originX: "100px" }}
        >
          <rect x="25" y="165" width="150" height="7" rx="1.5" fill="url(#metalBrass)" />
          <rect x="30" y="157" width="140" height="8" rx="1" fill="#0f1e36" stroke="url(#metalBrass)" strokeWidth="1.2" />
          <rect x="36" y="150" width="128" height="7" rx="1" fill="#0f1e36" stroke="url(#metalBrass)" strokeWidth="1" />
        </motion.g>

        {/* Solid Pillars */}
        <motion.g 
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          style={{ originY: "150px" }}
          fill="url(#metalBrass)"
        >
          {/* Pillar 1 */}
          <rect x="46" y="90" width="8" height="60" rx="0.5" />
          <rect x="44" y="87" width="12" height="3" />
          <rect x="44" y="148" width="12" height="2" />

          {/* Pillar 2 */}
          <rect x="66" y="90" width="8" height="60" rx="0.5" />
          <rect x="64" y="87" width="12" height="3" />
          <rect x="64" y="148" width="12" height="2" />

          {/* Pillar 3 */}
          <rect x="86" y="90" width="8" height="60" rx="0.5" />
          <rect x="84" y="87" width="12" height="3" />
          <rect x="84" y="148" width="12" height="2" />

          {/* Pillar 4 */}
          <rect x="106" y="90" width="8" height="60" rx="0.5" />
          <rect x="104" y="87" width="12" height="3" />
          <rect x="104" y="148" width="12" height="2" />

          {/* Pillar 5 */}
          <rect x="126" y="90" width="8" height="60" rx="0.5" />
          <rect x="124" y="87" width="12" height="3" />
          <rect x="124" y="148" width="12" height="2" />

          {/* Pillar 6 */}
          <rect x="146" y="90" width="8" height="60" rx="0.5" />
          <rect x="144" y="87" width="12" height="3" />
          <rect x="144" y="148" width="12" height="2" />
        </motion.g>

        {/* Architrave & Frieze */}
        <motion.rect 
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{ originX: "100px" }}
          x="36" y="80" width="128" height="8" fill="url(#metalBrass)" 
        />
        <line x1="38" y1="84" x2="162" y2="84" stroke="#0f1e36" strokeWidth="1" />

        {/* Pediment (Triangle Top), Dome, Ashoka emblem */}
        <motion.g
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        >
          {/* Pediment */}
          <path
            d="M 34 80 L 166 80 L 100 48 Z"
            fill="#0f1e36"
            stroke="url(#metalBrass)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          
          {/* Emblem inside Pediment */}
          <circle cx="100" cy="69" r="6" stroke="url(#metalBrass)" strokeWidth="1" />
          <circle cx="100" cy="69" r="2" fill="url(#metalBrass)" />

          {/* Dome */}
          <path
            d="M 65 48 C 65 24, 135 24, 135 48 Z"
            fill="none"
            stroke="url(#metalBrass)"
            strokeWidth="1.5"
            strokeDasharray="4,2"
            opacity="0.6"
          />
          <path
            d="M 75 48 C 75 32, 125 32, 125 48 Z"
            fill="none"
            stroke="url(#metalBrass)"
            strokeWidth="1.2"
          />
          {/* Dome Spire */}
          <line x1="100" y1="30" x2="100" y2="15" stroke="url(#metalBrass)" strokeWidth="1.2" />
          <circle cx="100" cy="13" r="2" fill="url(#metalBrass)" />
        </motion.g>

        {/* Gate/Doorway in Center */}
        <motion.path
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, delay: 0.7, ease: "easeOut" }}
          style={{ originY: "150px" }}
          d="M 94 150 L 94 115 C 94 110, 106 110, 106 115 L 106 150 Z"
          fill="#0f1e36"
          stroke="url(#metalBrass)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
