"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CourtHub {
  id: string;
  name: string;
  location: string;
  caseload: string;
  aiAssisted: string;
  loadIndex: "High" | "Medium" | "Low";
  loadPercent: number;
  x: number; // percentage coordinate inside SVG
  y: number; // percentage coordinate inside SVG
}

export default function IndiaMapComponent() {
  const [selectedHub, setSelectedHub] = useState<CourtHub | null>(null);

  const courtHubs: CourtHub[] = [
    {
      id: "delhi",
      name: "Supreme Court of India / Delhi High Court",
      location: "New Delhi",
      caseload: "48,201 cases tracking",
      aiAssisted: "94.5% validation rate",
      loadIndex: "High",
      loadPercent: 88,
      x: 38,
      y: 30,
    },
    {
      id: "mumbai",
      name: "Bombay High Court",
      location: "Mumbai",
      caseload: "32,940 cases tracking",
      aiAssisted: "92.1% validation rate",
      loadIndex: "Medium",
      loadPercent: 64,
      x: 25,
      y: 65,
    },
    {
      id: "chennai",
      name: "Madras High Court",
      location: "Chennai",
      caseload: "24,810 cases tracking",
      aiAssisted: "95.2% validation rate",
      loadIndex: "Medium",
      loadPercent: 55,
      x: 42,
      y: 84,
    },
    {
      id: "kolkata",
      name: "Calcutta High Court",
      location: "Kolkata",
      caseload: "19,250 cases tracking",
      aiAssisted: "89.8% validation rate",
      loadIndex: "Medium",
      loadPercent: 62,
      x: 74,
      y: 53,
    },
    {
      id: "bengaluru",
      name: "Karnataka High Court",
      location: "Bengaluru",
      caseload: "28,140 cases tracking",
      aiAssisted: "93.0% validation rate",
      loadIndex: "High",
      loadPercent: 78,
      x: 36,
      y: 78,
    },
    {
      id: "allahabad",
      name: "Allahabad High Court",
      location: "Prayagraj",
      caseload: "54,320 cases tracking",
      aiAssisted: "91.4% validation rate",
      loadIndex: "High",
      loadPercent: 92,
      x: 52,
      y: 40,
    },
  ];

  return (
    <div
      id="india-map-container"
      className="relative w-full max-w-[500px] aspect-[4/5] bg-stone-50 dark:bg-slate-900/60 border border-stone-200 dark:border-slate-800 rounded-xl p-6 institutional-panel overflow-hidden"
    >
      {/* Map Header */}
      <div className="relative z-10 mb-4">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-stone-700 dark:text-stone-300">
          Judicial Caseload Density
        </h3>
        <p className="text-xs text-stone-500 dark:text-slate-400">
          State High Court & Subordinate District Bench Nodes
        </p>
      </div>

      <div className="relative w-full h-[75%] flex justify-center items-center">
        {/* Stylized Outline of India using SVG */}
        <svg
          viewBox="0 0 200 240"
          className="w-full h-full opacity-60 stroke-stone-400 dark:stroke-slate-600"
          fill="none"
          strokeWidth="1.2"
          strokeLinejoin="round"
        >
          <path
            d="
              M 92 10 
              L 108 10 L 115 22 L 102 38 L 108 50 L 122 55 L 126 68 L 138 72 L 140 82 
              L 165 85 L 180 82 L 188 92 L 180 102 L 168 98 L 164 108 L 155 106 L 150 114 
              L 155 125 L 148 135 L 140 128 L 134 135 L 125 130 L 120 135 L 126 142 L 124 152 
              L 115 158 L 116 172 L 104 185 L 94 198 L 88 210 L 86 226 L 82 230 L 80 220 
              L 76 200 L 78 190 L 74 175 L 75 160 L 68 152 L 64 138 L 52 135 L 56 120 
              L 44 116 L 36 122 L 28 116 L 32 102 L 20 95 L 24 88 L 36 84 L 46 86 
              L 54 75 L 68 76 L 76 68 L 74 58 L 80 50 L 76 40 L 84 25 Z
            "
            fill="rgba(15, 30, 54, 0.03)"
            stroke="currentColor"
          />
        </svg>

        {/* Hotspots / Pulse points */}
        {courtHubs.map((hub) => {
          const isSelected = selectedHub?.id === hub.id;
          return (
            <div
              key={hub.id}
              style={{ left: `${hub.x}%`, top: `${hub.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
              onMouseEnter={() => setSelectedHub(hub)}
              onMouseLeave={() => setSelectedHub(null)}
            >
              {/* Central dot */}
              <div
                className={`w-3 h-3 rounded-full border border-white dark:border-slate-900 shadow transition-all duration-200 ${
                  isSelected
                    ? "scale-125 bg-amber-700 dark:bg-amber-500"
                    : hub.loadIndex === "High"
                    ? "bg-slate-700 dark:bg-slate-400"
                    : "bg-stone-500 dark:bg-stone-400"
                }`}
              />

              <span className="sr-only">{hub.location}</span>
            </div>
          );
        })}
      </div>

      {/* Floating Detailed Panel showing active selection */}
      <div className="absolute bottom-4 left-4 right-4 h-24 bg-white/95 dark:bg-slate-800/90 rounded-lg p-3.5 flex flex-col justify-center border border-stone-200 dark:border-slate-700 shadow-sm">
        <AnimatePresence mode="wait">
          {selectedHub ? (
            <motion.div
              key={selectedHub.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-100">{selectedHub.name}</h4>
                  <p className="text-[11px] text-slate-400">{selectedHub.location}</p>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                    selectedHub.loadIndex === "High"
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  Load: {selectedHub.loadIndex} ({selectedHub.loadPercent}%)
                </span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-medium text-yellow-500">{selectedHub.caseload}</span>
                <span className="text-[10px] text-slate-400">{selectedHub.aiAssisted}</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-xs text-slate-500"
            >
              Hover over the highlighted judicial hubs on the map to inspect live metrics.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
