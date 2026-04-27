import { useState } from "react";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import { cn } from "./ui/utils";
import { ViewState } from "../types";

export type MobileNavId = ViewState | "kromePro";

export interface NavItem {
    id: MobileNavId;
    label: string;
    icon: any;
    isProEntry?: boolean;
}

interface MobileBottomNavProps {
    navItems: readonly NavItem[];
    view: ViewState;
    setView: (view: MobileNavId) => void;
    isProUser: boolean;
    proItems: readonly { id: ViewState; label: string; icon: any }[];
    isProView: (view: ViewState) => boolean;
}

export function MobileBottomNav({ navItems, view, setView, isProUser, proItems, isProView }: MobileBottomNavProps) {
    const [isProMenuOpen, setIsProMenuOpen] = useState(false);
    const isCanvasProView = view === "canvasDashboard" || view === "canvas" || view === "examSim";

    return (
        <>
            {isProUser && isProMenuOpen ? (
                <div className="md:hidden fixed inset-x-4 bottom-[5.3rem] z-50 rounded-2xl border border-kromeAccent/20 bg-slate-950/95 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
                    <div className="grid grid-cols-3 gap-2">
                        {proItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.id === "canvasDashboard" ? isCanvasProView : view === item.id;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setIsProMenuOpen(false);
                                        setView(item.id);
                                    }}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-3 text-[11px] font-semibold transition-colors",
                                        isActive
                                            ? "bg-kromeAccent/14 text-kromeAccent"
                                            : "bg-slate-900/80 text-slate-400 hover:text-slate-200",
                                    )}
                                >
                                    <Icon size={16} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0b1220] border-t border-white/5 flex justify-around items-center z-50 px-2 pb-[env(safe-area-inset-bottom)]">
                {navItems.map((item) => {
                    const isActive = item.isProEntry ? isProView(view) : view === item.id;
                    const Icon = item.isProEntry ? Sparkles : item.icon;

                    return (
                        <button
                            type="button"
                            key={item.id}
                            onClick={() => {
                                if (item.isProEntry && isProUser) {
                                    setIsProMenuOpen((previousValue) => !previousValue);
                                    return;
                                }

                                setIsProMenuOpen(false);
                                setView(item.id);
                            }}
                            className={cn(
                                "flex min-w-[44px] min-h-[44px] flex-col items-center justify-center px-2 py-1 transition-all duration-200",
                                isActive
                                    ? item.isProEntry
                                        ? "rounded-xl border border-kromeAccent/25 bg-kromeAccent/10 text-kromeAccent"
                                        : "rounded-xl bg-white/5 text-kromeAccent"
                                    : item.isProEntry
                                        ? "text-kromeAccent/80 hover:text-kromeAccent"
                                        : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <span className="mb-1 flex items-center gap-1">
                                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                {item.isProEntry && isProUser ? (
                                    <ChevronUp size={11} className={cn("transition-transform", isProMenuOpen ? "rotate-0" : "rotate-180")} />
                                ) : null}
                            </span>
                            <span className={cn("text-center text-[9px] font-semibold tracking-wide leading-[1.05]", item.isProEntry ? "text-kromeAccent" : "")}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </>
    );
}
