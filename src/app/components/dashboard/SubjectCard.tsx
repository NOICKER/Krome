import { Subject } from "../../types";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

interface SubjectCardProps {
    subject: Subject;
    blocksToday: number;
    minutesToday: number;
    lastSessionTime: string | null;
    onDelete?: (id: string, name: string) => void;
}

export function SubjectCard({ subject, blocksToday, minutesToday, lastSessionTime, onDelete }: SubjectCardProps) {
    const handleDelete = () => {
        if (window.confirm(`Are you SURE you want to delete "${subject.name}" and ALL its history? This cannot be undone.`)) {
            if (onDelete) onDelete(subject.id, subject.name);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col space-y-2 relative group hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start">
                <h3 className="text-slate-100 font-bold tracking-tight">{subject.name}</h3>
                {onDelete ? (
                    <button
                        onClick={handleDelete}
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
        </div>
    );
}
