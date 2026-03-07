import React, { useState, useEffect, useMemo } from "react";
import { cn } from "./utils";

interface KromeSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    onValueChange: (val: number) => void;
    disabled?: boolean;
}

export function KromeSlider({ label, value, min, max, onValueChange, disabled = false }: KromeSliderProps) {
    const [localVal, setLocalVal] = useState(value.toString());
    const clampValue = (nextValue: number) => Math.min(max, Math.max(min, nextValue));

    const fillPercent = useMemo(() => {
        return ((value - min) / (max - min)) * 100;
    }, [value, min, max]);

    useEffect(() => {
        setLocalVal(value.toString());
    }, [value]);

    const handleBlur = () => {
        const numeric = parseInt(localVal, 10);
        if (isNaN(numeric)) {
            setLocalVal(value.toString());
            return;
        }
        const clampedValue = clampValue(numeric);
        setLocalVal(clampedValue.toString());
        onValueChange(clampedValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleBlur();
        }
    };

    return (
        <div className={cn("space-y-3", disabled ? "opacity-50" : "")}>
            <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-300">{label}</label>
                <input
                    type="number"
                    min={min}
                    max={max}
                    step={1}
                    disabled={disabled}
                    value={localVal}
                    onChange={(e) => setLocalVal(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="w-14 h-8 bg-slate-800/60 border border-slate-600/50 rounded-lg text-center text-sm font-mono font-bold text-kromeAccent focus:outline-none focus:border-kromeAccent/60 focus:ring-1 focus:ring-kromeAccent/30 hide-arrows transition-all duration-200"
                />
            </div>
            <div className="relative w-full h-5 flex items-center">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={1}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => {
                        const nextValue = clampValue(parseInt(e.target.value, 10));
                        setLocalVal(nextValue.toString());
                        onValueChange(nextValue);
                    }}
                    style={{
                        background: `linear-gradient(to right, #6F78B5 0%, #6F78B5 ${fillPercent}%, #334155 ${fillPercent}%, #334155 100%)`,
                    }}
                    className="krome-range-slider w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed transition-all duration-150"
                />
            </div>
        </div>
    );
}
