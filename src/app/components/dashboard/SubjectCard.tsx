import { GoalProgress, Subject } from "../../types";
import Play from "lucide-react/dist/esm/icons/play";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { getGoalProgressPercent, getGoalUnitLabel } from "../../utils/goalUtils";

interface SubjectCardProps {
    subject: Subject;
    blocksToday: number;
    minutesToday: number;
    lastSessionTime: string | null;
    goalProgress: GoalProgress;
    goalCurrent: number;
    sessionMinutes: number;
    strictMode: boolean;
    startDisabled?: boolean;
    onStart?: (subject: Subject) => void;
    onOpenDetails?: (subject: Subject) => void;
    onDelete?: (id: string, name: string) => void;
}

export function SubjectCard({
    subject,
    blocksToday,
    minutesToday,
    lastSessionTime,
    goalProgress,
    goalCurrent,
    sessionMinutes,
    strictMode,
    startDisabled = false,
    onStart,
    onOpenDetails,
    onDelete,
}: SubjectCardProps) {
    const progress = getGoalProgressPercent({ ...goalProgress, current: goalCurrent });
    const goalUnit = getGoalUnitLabel(goalProgress.type);

    const handleDelete = () => {
        if (window.confirm(`Are you SURE you want to delete "${subject.name}" and ALL its history? This cannot be undone.`)) {
            if (onDelete) onDelete(subject.id, subject.name);
        }
    };

    return (
        <div
            onClick={() => onOpenDetails?.(subject)}
            className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col space-y-4 relative group hover:border-slate-700 transition-colors cursor-pointer"
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color || "#62699D" }} />
                    <div>
                        <h3 className="text-slate-100 font-bold tracking-tight">{subject.name}</h3>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 mt-1">
                            Goal {goalCurrent}/{goalProgress.target} {goalUnit}
                        </p>
                    </div>
                </div>
                {onDelete ? (
                    <button
                        onClick={(event) => {
                            event.stopPropagation();
                            handleDelete();
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg -mt-1 -mr-1"
                        title="Delete Subject"
                    >
                        <Trash2 size={16} />
                    </button>
                ) : null}
            </div>
            <div className="text-slate-400 text-sm">
                <p>{blocksToday} blocks today ({minutesToday}m)</p>
                {lastSessionTime ? <p className="text-xs mt-1 text-slate-500">Last focus: {lastSessionTime}</p> : null}
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-kromeAccent transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/70 pt-3">
                <span>{sessionMinutes}m block</span>
                <span>{strictMode ? "Strict Mode" : "Observed"}</span>
            </div>
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onStart?.(subject);
                }}
                disabled={startDisabled}
                className="h-11 rounded-xl bg-kromeAccent text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-kromeAccent/85 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Play size={16} fill="currentColor" />
                Start Focus
            </button>
        </div>
    );
}
