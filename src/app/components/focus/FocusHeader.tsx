import { format } from "date-fns";
import { GlobalProfileButton } from "../ui/GlobalProfileButton";

interface FocusHeaderProps {
    potValue: number;
    title?: string;
}

export function FocusHeader({ potValue, title }: FocusHeaderProps) {
    const now = new Date();
    const timeString = format(now, 'HH:mm');
    const dateString = format(now, 'EEEE, MMMM do');

    return (
        <div className="hidden md:flex flex-row items-center justify-between w-full max-w-[980px] mx-auto px-4 md:px-8 py-3 md:py-4 border-b border-slate-900 mb-4 md:mb-6 h-16 md:h-auto flex-nowrap min-w-0 max-w-full">
            {/* Left: Time & Date */}
            <div className="flex items-center min-w-0 md:min-w-[220px] flex-shrink flex-nowrap overflow-hidden pr-2 space-x-2 md:space-x-4">
                <img src="/k-icon.png" alt="Krome" className="h-5 md:h-8 w-auto object-contain flex-shrink-0" />
                <div className="flex flex-col gap-0.5 md:gap-1 min-w-0">
                    <span className="text-xl md:text-3xl font-display font-semibold text-slate-100 tracking-tight leading-none truncate">
                        {title ?? timeString}
                    </span>
                    <span className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-widest truncate hidden md:block">
                        {title ? `${timeString} • ${dateString}` : dateString}
                    </span>
                </div>
            </div>

            {/* Right: Pot Badge + Auth */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 flex-nowrap overflow-hidden">
                {/* Pot Badge */}
                <div className="group relative cursor-help flex-shrink-0">
                    <div className="flex items-center space-x-1 border-slate-800 md:space-x-2 rounded-full bg-slate-900/60 border px-2 py-1 md:px-4 md:py-1.5 text-sm transition-colors group-hover:bg-slate-800/60">
                        <span className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-widest hidden md:inline">Pot</span>
                        <span className="text-kromeAccent font-mono font-bold text-xs md:text-sm">
                            {potValue > 0 ? `+${potValue}` : potValue}
                        </span>
                    </div>
                    <div className="absolute top-10 right-0 w-48 bg-slate-800 border border-slate-700/80 rounded-lg p-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                        <p className="text-[10px] text-slate-300 font-medium tracking-wide text-center">
                            <span className="text-kromeAccent">Retained</span> – <span className="text-amber-500">Spilled</span> = Pot
                        </p>
                    </div>
                </div>

                <GlobalProfileButton />
            </div>
        </div>
    );
}


