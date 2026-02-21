interface ObservationPanelProps {
    observations: string[];
}

export function ObservationPanel({ observations }: ObservationPanelProps) {
    return (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full">
            <h3 className="text-slate-300 font-bold uppercase tracking-widest text-sm mb-4">Observations</h3>
            <ul className="space-y-4">
                {observations.map((obs, i) => (
                    <li key={i} className="text-slate-400 text-sm leading-relaxed border-l-2 border-slate-700 pl-3">
                        {obs}
                    </li>
                ))}
            </ul>
        </div>
    );
}
