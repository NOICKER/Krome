import { Subject } from "../../types";

interface SubjectCardProps {
    subject: Subject;
    blocksToday: number;
    minutesToday: number;
    lastSessionTime: string | null;
}

export function SubjectCard({ subject, blocksToday, minutesToday, lastSessionTime }: SubjectCardProps) {
    return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col space-y-2">
            <h3 className="text-slate-100 font-bold tracking-tight">{subject.name}</h3>
            <div className="text-slate-400 text-sm">
                <p>{blocksToday} blocks today ({minutesToday}m)</p>
                {lastSessionTime ? <p className="text-xs mt-1 text-slate-500">Last focus: {lastSessionTime}</p> : null}
            </div>
        </div>
    );
}
