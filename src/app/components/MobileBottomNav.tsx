import { cn } from "./ui/utils";
import { ViewState } from "../types";

export interface NavItem {
    id: ViewState;
    label: string;
    icon: any;
}

interface MobileBottomNavProps {
    navItems: readonly NavItem[];
    view: ViewState;
    setView: (view: ViewState) => void;
}

export function MobileBottomNav({ navItems, view, setView }: MobileBottomNavProps) {
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0b1220] border-t border-white/5 flex justify-around items-center z-50 px-2 pb-[env(safe-area-inset-bottom)]">
            {navItems.map((item) => {
                const isActive = view === item.id;
                const Icon = item.icon;

                return (
                    <button
                        key={item.id}
                        onClick={() => setView(item.id)}
                        className={cn(
                            "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-1 transition-all duration-200",
                            isActive ? "bg-white/5 rounded-xl text-kromeAccent" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
                        <span className="text-[10px] font-medium tracking-wide">
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
