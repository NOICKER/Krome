import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { KromeHistoryEntry } from '../types';

interface CalendarViewProps {
    history: KromeHistoryEntry[];
    selectedDate: string;
    onSelectDate: (date: string) => void;
}

export function CalendarView({ history, selectedDate, onSelectDate }: CalendarViewProps) {
    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    const activityMap = useMemo(() => {
        const map = new Map<string, { count: number, potSpilled: boolean }>();
        history.forEach(entry => {
            const existing = map.get(entry.dateISO) || { count: 0, potSpilled: false };
            existing.count += 1;
            if (entry.potSpilled) existing.potSpilled = true;
            map.set(entry.dateISO, existing);
        });
        return map;
    }, [history]);

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const renderDays = () => {
        const days = [];
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // Empty cells for first week
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const data = activityMap.get(dateStr);
            const isActive = data && data.count > 0;
            const isSpilled = data?.potSpilled;
            const isSelected = selectedDate === dateStr;

            days.push(
                <button
                    key={dateStr}
                    onClick={() => onSelectDate(dateStr)}
                    title={isSpilled ? 'Pot Spilled' : isActive ? `${data.count} sessions` : 'No activity'}
                    className={`flex flex-col items-center justify-center h-8 w-8 rounded-md text-xs transition-colors relative
                    ${isSelected ? 'bg-slate-200 dark:bg-slate-700 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}
                    ${isActive ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400 dark:text-slate-500'}
                `}
                >
                    <span>{d}</span>
                    <div className="flex gap-0.5 mt-0.5 absolute bottom-1">
                        {isActive && !isSpilled && <div className="w-1 h-1 rounded-full bg-slate-500 dark:bg-slate-400" />}
                        {isSpilled && <div className="w-1 h-1 rounded-full bg-red-500 dark:bg-red-400" />}
                    </div>
                </button>
            );
        }

        return days;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div className="w-full max-w-xs mx-auto p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <div className="flex space-x-1">
                    <button onClick={prevMonth} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={nextMonth} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs text-slate-400 uppercase font-medium">
                <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {renderDays()}
            </div>
        </div>
    );
}
