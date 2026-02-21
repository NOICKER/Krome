// @ts-nocheck
import React from "react";
import { cn } from "./utils";

interface KromeToggleProps {
    label: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (val: boolean) => void;
    disabled?: boolean;
}

export function KromeToggle({ label, description, checked, onCheckedChange, disabled = false }: KromeToggleProps) {
    return (
        <div className={cn("flex items-center justify-between py-3 px-1", disabled && "opacity-50")}>
            <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-200">{label}</span>
                {description && <span className="text-xs text-slate-500">{description}</span>}
            </div>
            <button
                onClick={() => !disabled && onCheckedChange(!checked)}
                disabled={disabled}
                className={cn(
                    "w-11 h-6 rounded-full transition-colors relative flex-shrink-0",
                    checked ? "bg-emerald-600" : "bg-slate-700"
                )}
            >
                <div className={cn(
                    "absolute top-1 left-1 w-4 h-4 bg-slate-200 rounded-full transition-transform shadow-sm",
                    checked ? "translate-x-5" : "translate-x-0"
                )} />
            </button>
        </div>
    );
}
