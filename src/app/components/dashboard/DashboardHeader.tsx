import { GlobalProfileButton } from "../ui/GlobalProfileButton";

interface DashboardHeaderProps {
    date: string;
    streak: number;
    potValue: number;
    strictMode: boolean;
    isActive: boolean;
}

export function DashboardHeader({ date, streak, potValue, strictMode, isActive }: DashboardHeaderProps) {
    return (
        <div className="w-full hidden md:flex flex-row items-center justify-between bg-[#080C18] pb-0 md:pb-6 border-b border-slate-800/50 mb-4 md:mb-6 h-16 md:h-auto overflow-hidden flex-nowrap min-w-0 max-w-full">
            <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-shrink flex-nowrap overflow-hidden pr-2">
                <img src="/k-icon.png" alt="Krome Icon" className="h-5 md:h-10 w-auto object-contain flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                    <h1 className="text-lg md:text-2xl font-display font-bold tracking-tight text-slate-100 truncate">Overview</h1>
                    <p className="text-xs md:text-sm text-slate-500 truncate hidden md:block">{date}</p>
                </div>
            </div>

            <div className="flex items-center gap-4 md:gap-6 flex-shrink-0 flex-nowrap overflow-hidden">
                <div className="hidden md:flex items-center gap-6 flex-shrink-0">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest leading-none mb-1">Streak</span>
                        <span className="text-lg font-mono text-kromeAccent leading-none">{streak}</span>
                    </div>

                    {strictMode && potValue !== 0 ? (
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest leading-none mb-1">Pot</span>
                            <span className="text-lg font-mono text-amber-500 leading-none">{potValue}</span>
                        </div>
                    ) : null}

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Status</span>
                        <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-kromeAccent/20 text-kromeAccent' : 'bg-slate-800 text-slate-400'}`}>
                            {isActive ? 'FOCUSING' : 'IDLE'}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-6 w-px bg-slate-800 mx-1" />
                </div>

                {/* Pot pill */}
                <div className="flex items-center space-x-1 border-slate-800 md:space-x-2 rounded-full bg-slate-900 border px-2 py-1 md:px-4 md:py-1.5 flex-shrink-0">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 hidden md:inline">Pot</span>
                    <span className={`text-xs md:text-sm font-bold font-mono ${potValue > 0 ? 'text-kromeAccent' : potValue < 0 ? 'text-red-400' : 'text-amber-500'}`}>
                        {potValue > 0 ? `+${potValue}` : potValue}
                    </span>
                </div>

                <GlobalProfileButton />
            </div>
        </div>
    );
}

