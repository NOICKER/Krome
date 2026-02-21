interface DashboardHeaderProps {
    date: string;
    streak: number;
    potValue: number;
    strictMode: boolean;
    isActive: boolean;
}

export function DashboardHeader({ date, streak, potValue, strictMode, isActive }: DashboardHeaderProps) {
    return (
        <div className="w-full flex md:flex-row flex-col items-start md:items-center justify-between bg-slate-950 pb-6 border-b border-slate-800/50 mb-6">
            <div className="flex flex-col mb-4 md:mb-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-100">Overview</h1>
                <p className="text-sm text-slate-500">{date}</p>
            </div>

            <div className="flex items-center space-x-6">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest leading-none mb-1">Streak</span>
                    <span className="text-lg font-mono text-emerald-400 leading-none">{streak}</span>
                </div>

                {strictMode && (
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest leading-none mb-1">Pot</span>
                        <span className="text-lg font-mono text-amber-500 leading-none">{potValue}</span>
                    </div>
                )}

                <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Status</span>
                    <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {isActive ? 'FOCUSING' : 'IDLE'}
                    </div>
                </div>
            </div>
        </div>
    );
}
