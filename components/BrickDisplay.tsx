import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Settings } from '../types';

interface BrickDisplayProps {
  totalDurationMs: number;
  intervalMs?: number; // Added to support explicit interval logic
  startTime: number | null; // If null, session not active
  settings: Settings;
  onComplete: () => void;
  onFill?: () => void; // Callback to trigger sound/vibrate in parent
  totalBlocks?: number;
  isPaused?: boolean; // Visual pause only (modal open)
  isAbandoned?: boolean; // Visual desaturation
  claimedEndTime?: number; // Phase 1: Absolute end time override
}

export const BrickDisplay: React.FC<BrickDisplayProps> = ({
  totalDurationMs,
  intervalMs,
  startTime,
  settings,
  onComplete,
  onFill,
  totalBlocks = 6,
  isPaused = false,
  isAbandoned = false,
  claimedEndTime
}) => {
  const [filledCount, setFilledCount] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const lastFilledRef = useRef(0);

  useEffect(() => {
    if (!startTime) {
      setFilledCount(0);
      setProgressPercent(0);
      lastFilledRef.current = 0;
      return;
    }

    if (isAbandoned) return;

    let rafId: number;

    const tick = () => {
      const now = Date.now();

      // Phase 1: Claimed Period Check
      if (claimedEndTime) {
        if (now >= claimedEndTime) {
          // Force visual completion
          setFilledCount(totalBlocks);
          setProgressPercent(100);
          onComplete();
          return; // Stop ticking
        }
      }

      const elapsed = now - startTime;

      // Calculate filled blocks based on interval if provided, otherwise fallback to distribution
      let shouldBeFilled = 0;

      if (intervalMs && intervalMs > 0) {
        shouldBeFilled = Math.floor(elapsed / intervalMs);
      } else {
        const rawProgress = elapsed / totalDurationMs;
        const progress = Math.min(rawProgress, 1);
        shouldBeFilled = Math.floor(progress * totalBlocks);
      }

      // Ensure we don't exceed totalBlocks visually, but logic allows completion
      const visualFilled = Math.min(shouldBeFilled, totalBlocks);

      if (visualFilled > lastFilledRef.current) {
        setFilledCount(visualFilled);
        lastFilledRef.current = visualFilled;
        if (onFill) onFill();
      }

      // Sync state if re-mounted
      if (visualFilled > filledCount) {
        setFilledCount(visualFilled);
        lastFilledRef.current = visualFilled;
      }

      const progress = Math.min(elapsed / totalDurationMs, 1);
      setProgressPercent(progress * 100);

      // Completion Logic: If all blocks are filled (via interval) OR time is up
      // Only run standard completion if NOT in claimed mode (claimed mode waits for specific time)
      if (!claimedEndTime && (shouldBeFilled >= totalBlocks || progress >= 1)) {
        setFilledCount(totalBlocks);
        onComplete();
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [startTime, totalDurationMs, intervalMs, onComplete, onFill, totalBlocks, isAbandoned, filledCount, claimedEndTime]);

  const getBrickColor = () => {
    if (isAbandoned) return 'bg-slate-400 dark:bg-slate-600 grayscale';
    // Single accent color per UI redesign specs
    return 'bg-kromeAccent';
  };

  return (
    <div className={`w-full flex flex-col gap-4 transition-all duration-500 ${isAbandoned ? 'opacity-50 grayscale' : ''}`}>
      <div className="flex gap-2 h-16 sm:h-24 w-full">
        {Array.from({ length: totalBlocks }).map((_, i) => (
          <div
            key={i}
            className={`
              relative flex-1 rounded-md border-2 overflow-hidden transition-colors duration-300
              ${i < filledCount
                ? 'border-transparent'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}
            `}
            role="img"
            aria-label={`Brick ${i + 1} of ${totalBlocks} ${i < filledCount ? 'completed' : 'pending'}`}
          >
            {i < filledCount && (
              <motion.div
                layoutId={`brick-${i}`}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{
                  duration: settings.reducedMotion ? 0 : 0.4,
                  ease: "easeOut"
                }}
                className={`absolute inset-0 origin-bottom w-full h-full ${getBrickColor()}`}
              >
                {!settings.reducedMotion && !isAbandoned && (
                  <motion.div
                    initial={{ opacity: 0.5, y: "100%" }}
                    animate={{ opacity: 0, y: "-20%" }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-gradient-to-t from-white/30 to-transparent"
                  />
                )}
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Subtle progress bar (Visual Polish) */}
      {startTime && !settings.reducedMotion && !isAbandoned && (
        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-300 dark:bg-slate-600 transition-all duration-300 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};