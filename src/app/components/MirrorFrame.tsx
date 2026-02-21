import React, { ReactNode } from "react";

/**
 * MirrorFrame — L1 surface wrapper for the BrickDisplay.
 * 32px internal padding, 1px inner border, rounded-[20px].
 * No heavy glow. Bricks must not float on raw page background.
 */
interface MirrorFrameProps {
    children: ReactNode;
}

export function MirrorFrame({ children }: MirrorFrameProps) {
    return (
        <div className="
      relative
      w-full
      bg-slate-900/70
      border border-slate-700
      rounded-2xl
      p-10
      shadow-[inset_0_0_40px_rgba(16,185,129,0.05),0_4px_24px_rgba(0,0,0,0.4)]
      backdrop-blur-sm
    ">
            {/* Subtle inner border */}
            <div className="
        absolute inset-[1px] rounded-[15px] 
        ring-1 ring-inset ring-slate-700/30 
        pointer-events-none
      " />
            {children}
        </div>
    );
}
