interface ModeStripProps {
    mode: 'focus' | 'reset';
    onModeChange: (mode: 'focus' | 'reset') => void;
}

export function ModeStrip({ mode, onModeChange }: ModeStripProps) {
    return (
        <div className="flex items-center space-x-1 p-1 bg-slate-900/40 border border-slate-800 rounded-full backdrop-blur-sm shadow-sm">
            <button
                onClick={() => onModeChange('focus')}
                className={`px-6 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-200 ${mode === 'focus'
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                    }`}
            >
                Focus
            </button>
            <button
                onClick={() => onModeChange('reset')}
                className={`px-6 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-200 ${mode === 'reset'
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                    }`}
            >
                Reset
            </button>
        </div>
    );
}
