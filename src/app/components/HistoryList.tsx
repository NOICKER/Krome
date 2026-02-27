import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { HistoryEntry } from "../types";
import { Card } from "./ui/card";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "./ui/utils";

interface HistoryListProps {
  entries: HistoryEntry[];
}

export function HistoryList({ entries }: HistoryListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Clock className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-medium uppercase tracking-widest">Your sessions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {entries.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="flex items-center justify-between p-4 group hover:bg-slate-800/80 transition-colors border-l-4 border-l-transparent hover:border-l-kromeAccent">
              <div className="flex items-start space-x-4">
                <div className={cn(
                  "p-2 rounded-full mt-1",
                  entry.completed ? "bg-kromeAccent/10 text-kromeAccent" : "bg-red-500/10 text-red-500"
                )}>
                  {entry.completed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-200 font-medium">
                      {entry.subject || "General"}
                    </span>
                    {!entry.completed && (
                      <span className="text-[10px] uppercase font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded tracking-wider">
                        Abandoned
                      </span>
                    )}
                    {entry.potSpilled && (
                      <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded tracking-wider flex items-center space-x-1">
                        <AlertCircle size={10} />
                        <span>Spilled</span>
                      </span>
                    )}
                  </div>

                  {entry.intent && (
                    <p className="text-slate-500 text-sm line-clamp-1 italic">
                      "{entry.intent}"
                    </p>
                  )}

                  <div className="flex items-center text-xs text-slate-600 space-x-3 pt-1 font-mono">
                    <span>{format(entry.startedAt, "MMM d, h:mm a")}</span>
                    <span>•</span>
                    <span>{Math.floor(entry.durationMs / 60000)}m</span>
                  </div>
                </div>
              </div>

              {/* Right side duration badge (for successful ones mostly) */}
              {entry.completed && (
                <div className="hidden sm:block text-kromeAccent/50 font-mono text-xl font-light tracking-tighter">
                  {Math.floor(entry.durationMs / 60000)}
                  <span className="text-sm ml-0.5">m</span>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
