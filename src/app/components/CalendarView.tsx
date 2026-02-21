import { useState } from "react";
import { format } from "date-fns";
import { motion } from "motion/react";
import { cn } from "./ui/utils";
import { KromeDay, HistoryEntry } from "../types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarViewProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  history: HistoryEntry[];
  days: KromeDay[];
}

export function CalendarView({
  selectedDate,
  onSelectDate,
  history
}: CalendarViewProps) {

  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Create a map of dates with activity
  const activityMap = new Map<string, number>();
  history.forEach(entry => {
    if (entry.completed) {
      activityMap.set(entry.dateISO, (activityMap.get(entry.dateISO) || 0) + 1);
    }
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1 text-slate-400 hover:text-slate-200 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold text-slate-200 uppercase tracking-widest">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <button onClick={nextMonth} className="p-1 text-slate-400 hover:text-slate-200 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day name headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;

          const date = new Date(year, month, day);
          const dateStr = format(date, "yyyy-MM-dd");
          const isSelected = selectedDate && format(selectedDate, "yyyy-MM-dd") === dateStr;
          const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
          const activityCount = activityMap.get(dateStr) || 0;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(date)}
              className={cn(
                "relative w-full aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-mono transition-all",
                isSelected
                  ? "bg-emerald-500 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  : isToday
                    ? "bg-slate-800 text-emerald-400 font-bold"
                    : "text-slate-400 hover:bg-slate-800/80"
              )}
            >
              <span>{day}</span>
              {activityCount > 0 && !isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_4px_rgba(16,185,129,0.8)]"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
