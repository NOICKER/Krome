import { motion } from "motion/react";
import { KromeDay, HistoryEntry } from "../types";
import { CalendarView } from "./CalendarView";
import { HistoryList } from "./HistoryList";
import { Card } from "./ui/card";
import { useState } from "react";
import { format, isSameDay } from "date-fns";

interface ReviewViewProps {
  day: KromeDay;
  history: HistoryEntry[];
}

export function ReviewView({ day, history }: ReviewViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const filteredHistory = selectedDate
    ? history.filter(h => isSameDay(new Date(h.dateISO), selectedDate))
    : history;

  // Calculate stats for the selected day from history
  const selectedDayBlocks = filteredHistory.filter(h => h.completed).length;
  const selectedDayTotalTime = filteredHistory.reduce((acc, h) => acc + h.durationMs, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-24 max-w-6xl mx-auto w-full"
    >
      <div className="space-y-1 py-4 lg:py-8 lg:px-4 min-w-0 max-w-full">
        <h2 className="text-2xl lg:text-3xl font-display font-bold tracking-tight text-slate-100 truncate">Review</h2>
        <p className="text-slate-500 text-sm lg:text-base truncate">A factual log of your past sessions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 lg:px-4">

        {/* Left Column: Calendar & Summary */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 flex flex-col">
          <CalendarView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            history={history}
            days={[day]} // Should be expanded if we stored historical days
          />

          <Card className="flex flex-col items-center justify-center space-y-2 py-8 bg-slate-900/50 backdrop-blur-sm border-slate-800">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold">Daily Summary</h3>
            <div className="text-4xl lg:text-5xl font-thin text-slate-200 tracking-tighter">
              {Math.floor(selectedDayTotalTime / 60000)}
              <span className="text-lg text-slate-600 ml-1">min</span>
            </div>
            <div className="text-sm text-slate-400 font-mono mt-2">
              {selectedDayBlocks} blocks completed
            </div>
          </Card>
        </div>

        {/* Right Column: History List */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3 px-2 pb-2 border-b border-slate-800">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold flex flex-wrap items-center gap-2">
              <span>Session History</span>
              {selectedDate ? <span className="px-2 py-0.5 bg-slate-800 rounded text-slate-300">{format(selectedDate, "MMM d, yyyy")}</span> : null}
            </h3>
            <button className="text-xs text-kromeAccent hover:text-kromeAccent/80 transition-colors uppercase tracking-widest font-bold flex items-center gap-1 bg-kromeAccent/10 hover:bg-kromeAccent/20 px-3 py-1.5 rounded-lg flex-shrink-0">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export CSV
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <HistoryList entries={filteredHistory} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
