import React, { useState, useEffect } from "react";
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

    useEffect(() => {
        setLocalVal(value.toString());
    }, [value]);

    const handleBlur = () => {
        let numeric = parseInt(localVal);
        if (isNaN(numeric)) {
            setLocalVal(value.toString());
            return;
        }
        if (numeric < min) numeric = min;
        if (numeric > max) numeric = max;
        setLocalVal(numeric.toString());
        onValueChange(numeric);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleBlur();
        }
    };

    return (
        <div className={cn("space-y-2", disabled && "opacity-50")}>
            <div className="flex justify-between items-center h-8">
                <label className="text-sm font-medium text-slate-300">{label}</label>
                <input
                    type="number"
                    min={min}
                    max={max}
                    disabled={disabled}
                    value={localVal}
                    onChange={(e) => setLocalVal(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg text-center text-sm font-mono font-bold text-kromeAccent py-1 focus:outline-none focus:border-kromeAccent/50 focus:ring-1 focus:ring-kromeAccent/50 hide-arrows transition-colors"
                />
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                disabled={disabled}
                onChange={(e) => onValueChange(parseInt(e.target.value))}
                className="flex-1 h-2 appearance-none bg-slate-700 rounded-full cursor-pointer accent-kromeAccent disabled:cursor-not-allowed"
            />
        </div>
    );
}
