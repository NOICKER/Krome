import { motion } from "motion/react";
import { cn } from "./ui/utils";
import { calculateBricks } from "../core/sessionEngine";

interface BrickDisplayProps {
  totalDurationMinutes: number;
  intervalMinutes: number;
  elapsedMs: number;
  isActive: boolean;
  blindMode: boolean;
  subjectColor?: string;
}

export function BrickDisplay({
  totalDurationMinutes,
  intervalMinutes,
  elapsedMs,
  isActive,
  blindMode,
  subjectColor = '#62699D',
}: BrickDisplayProps) {

  const totalBlocks = Math.ceil(totalDurationMinutes / intervalMinutes);
  const { filledBricks: filledBlocks, currentBrickProgress: progressInCurrentBlock } = calculateBricks(elapsedMs, intervalMinutes, totalBlocks);
  const currentBlockIndex = filledBlocks;

  if (blindMode && isActive) {
    return (
      <div className="flex flex-col items-center justify-center h-64 lg:h-96 space-y-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
          className="text-kromeAccent/50 text-6xl md:text-8xl lg:text-9xl font-thin tracking-widest"
        >
          FOCUS
        </motion.div>
        <p className="text-slate-500 text-sm md:text-base tracking-widest uppercase mt-4">Period in progress</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-8 lg:py-16 px-4">
      {/* Responsive grid: 2 cols mobile → 3-4 tablet → 5 desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        {Array.from({ length: totalBlocks }).map((_, index) => {
          const isFilled = index < filledBlocks;
          const isCurrent = index === currentBlockIndex && isActive;

          // Filled color: use subject color; glow matches that color
          const filledBg = subjectColor;
          const glowColor = `${subjectColor}66`; // 40% alpha for shadow

          return (
            <div key={index} className="aspect-square relative group">
              {/* Background of the brick */}
              <div className="absolute inset-0 bg-slate-800/50 rounded-lg md:rounded-xl border border-slate-700/50" />

              {/* Filled State */}
              <motion.div
                className="absolute inset-0 rounded-lg md:rounded-xl"
                style={{
                  backgroundColor: isFilled ? filledBg : 'transparent',
                  boxShadow: isFilled ? `0 0 15px ${glowColor}` : 'none',
                }}
                initial={false}
                animate={{
                  opacity: isFilled ? 1 : 0,
                  scale: isFilled ? 1 : 0.9,
                }}
                transition={{ duration: 0.4 }}
              />

              {/* Current Active Pulse */}
              {isCurrent && (
                <motion.div
                  className="absolute inset-0 rounded-lg md:rounded-xl border overflow-hidden"
                  style={{ borderColor: `${subjectColor}80`, backgroundColor: `${subjectColor}14` }}
                  animate={{
                    opacity: [0.2, 0.5, 0.2],
                    scale: [0.95, 1.02, 0.95],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {/* Progress Fill for Current Block */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      height: `${progressInCurrentBlock * 100}%`,
                      backgroundColor: `${subjectColor}40`,
                    }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Timer Text / Ready Indicator */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 opacity-70">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isActive ? "animate-pulse" : "bg-slate-500"
            )}
            style={isActive ? { backgroundColor: subjectColor } : undefined}
          />
          <span className="text-slate-400 font-mono text-xs md:text-sm font-medium uppercase tracking-widest">
            {isActive ? "Session Active" : "Ready"}
          </span>
        </div>
      </div>
    </div>
  );
}
