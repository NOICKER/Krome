import { motion } from "motion/react";
import { cn } from "./ui/utils";
import { calculateBricks, getTotalBlocks } from "../core/sessionEngine";
import { buildBrickDisplayTheme } from "./brickDisplayTheme";

interface BrickDisplayProps {
  sessionMinutes: number;
  plipMinutes: number;
  elapsedMs: number;
  isActive: boolean;
  blindMode: boolean;
  subjectColor?: string;
}

export function BrickDisplay({
  sessionMinutes,
  plipMinutes,
  elapsedMs,
  isActive,
  blindMode,
  subjectColor = "#62699D",
}: BrickDisplayProps) {
  const isUniversalMode = !Number.isFinite(sessionMinutes);
  const intervalMs = plipMinutes * 60 * 1000;
  const theme = buildBrickDisplayTheme(subjectColor);
  const finiteBrickState = isUniversalMode
    ? null
    : calculateBricks(elapsedMs, {
        sessionMinutes,
        plipMinutes,
      });
  const filledBlocks = isUniversalMode
    ? Math.floor(elapsedMs / intervalMs)
    : finiteBrickState?.filledBricks ?? 0;
  const progressInCurrentBlock = isUniversalMode
    ? (elapsedMs % intervalMs) / intervalMs
    : finiteBrickState?.partialFill ?? 0;
  const currentBlockIndex = filledBlocks;
  const visibleBlockCount = isUniversalMode ? 10 : finiteBrickState?.totalBricks ?? getTotalBlocks(sessionMinutes, plipMinutes);
  const visibleStartIndex = isUniversalMode ? Math.max(0, filledBlocks - 4) : 0;

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        {Array.from({ length: visibleBlockCount }).map((_, index) => {
          const actualIndex = visibleStartIndex + index;
          const isFilled = actualIndex < filledBlocks;
          const isCurrent = actualIndex === currentBlockIndex && isActive;

          return (
            <div key={actualIndex} className="aspect-square relative group">
              <div className="absolute inset-0 bg-slate-800/50 rounded-lg md:rounded-xl border border-slate-700/50" />

              <motion.div
                className="absolute inset-0 rounded-lg md:rounded-xl"
                style={{
                  background: isFilled ? theme.filledBackground : "transparent",
                  boxShadow: isFilled ? theme.filledGlow : "none",
                }}
                initial={false}
                animate={{
                  opacity: isFilled ? 1 : 0,
                  scale: isFilled ? 1 : 0.92,
                }}
                transition={{ duration: 0.4 }}
              />

              {isCurrent && (
                <motion.div
                  className="absolute inset-0 rounded-lg md:rounded-xl border overflow-hidden"
                  style={{
                    borderColor: theme.currentShellBorder,
                    background: theme.currentShellBackground,
                    boxShadow: theme.currentShellGlow,
                  }}
                  animate={{
                    opacity: [0.7, 1, 0.7],
                    scale: [0.985, 1.02, 0.985],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <motion.div
                    className="absolute bottom-0 left-0 right-0"
                    animate={{
                      height: `${progressInCurrentBlock * 100}%`,
                    }}
                    style={{
                      background: theme.currentProgressBackground,
                      boxShadow: theme.currentProgressGlow,
                    }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: theme.currentHighlight }}
                    animate={{ opacity: [0.2, 0.45, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-900/50 border border-slate-800 opacity-70">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isActive ? "animate-pulse" : "bg-slate-500"
            )}
            style={isActive ? { backgroundColor: theme.statusDot } : undefined}
          />
          <span className="text-slate-400 font-mono text-xs md:text-sm font-medium uppercase tracking-widest">
            {isUniversalMode ? (isActive ? "Universal Focus" : "Universal Ready") : (isActive ? "Session Active" : "Ready")}
          </span>
        </div>
      </div>
    </div>
  );
}
