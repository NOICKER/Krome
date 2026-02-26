import { format } from "date-fns";

interface FocusHeaderProps {
    potValue: number;
}

export function FocusHeader({ potValue }: FocusHeaderProps) {
    const now = new Date();
    const timeString = format(now, 'HH:mm');
    const dateString = format(now, 'EEEE, MMMM do');

    return (
        <div className="flex items-center justify-between w-full max-w-[980px] mx-auto px-8 py-4 border-b border-slate-900 mb-6">
            {/* Left: Time & Date */}
            <div className="flex items-center min-w-[220px] flex-shrink-0 gap-4">
                <img src="/logo.png" alt="Krome" className="w-8 h-8 rounded-lg border border-slate-800 shadow-sm" />
                <div className="flex flex-col gap-1">
                    <span className="text-3xl font-semibold text-slate-100 tracking-tight leading-none">
                        {timeString}
                    </span>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                        {dateString}
                    </span>
                </div>
            </div>

            {/* Right: Pot Badge */}
            <div className="flex justify-end items-center min-w-[220px] flex-shrink-0 gap-3">
                <div className="group relative cursor-help">
                    <div className="flex items-center space-x-2 rounded-full bg-slate-900/60 border border-slate-800 px-4 py-1.5 text-sm transition-colors group-hover:bg-slate-800/60">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                            Pot
                        </span>
                        <span className="text-emerald-400 font-mono font-bold">
                            {potValue > 0 ? `+${potValue}` : potValue}
                        </span>
                    </div>

                    {/* Tooltip */}
                    <div className="absolute top-10 right-0 w-48 bg-slate-800 border border-slate-700/80 rounded-lg p-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                        <p className="text-[10px] text-slate-300 font-medium tracking-wide text-center">
                            <span className="text-emerald-400">Retained</span> – <span className="text-amber-500">Spilled</span> = Pot
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

