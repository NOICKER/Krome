interface MicroInsightProps {
    insights: string[];
}

export function MicroInsight({ insights }: MicroInsightProps) {
    // Only display the highest priority insight (index 0)
    if (!insights || insights.length === 0) return null;

    return (
        <div className="w-full text-center mt-6 mb-4">
            <p className="text-xs text-slate-400 font-medium tracking-wide">
                {insights[0]}
            </p>
        </div>
    );
}
