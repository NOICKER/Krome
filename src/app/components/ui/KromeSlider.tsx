// @ts-nocheck
import React from "react";
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
    return (
        <div className={cn("space-y-2", disabled && "opacity-50")}>
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">{label}</label>
                <span className="text-sm font-mono font-bold text-emerald-500">{value}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                disabled={disabled}
                onChange={(e) => onValueChange(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:cursor-not-allowed"
            />
        </div>
    );
}
