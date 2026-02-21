import { motion, AnimatePresence } from "motion/react";
import { Coffee, X } from "lucide-react";

interface BreakSuggesterProps {
    onStartBreak: () => void;
    onDismiss: () => void;
}

export function BreakSuggester({ onStartBreak, onDismiss }: BreakSuggesterProps) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="fixed bottom-24 right-4 md:right-8 z-40 bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-4 w-72 md:w-80 overflow-hidden group"
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />

                <button
                    onClick={onDismiss}
                    className="absolute top-2 right-2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                >
                    <X size={16} />
                </button>

                <div className="flex items-start space-x-4">
                    <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-500 flex-shrink-0">
                        <Coffee size={24} />
                    </div>
                    <div className="space-y-1 pr-6">
                        <h3 className="text-sm font-bold text-slate-100">Take a breather</h3>
                        <p className="text-xs text-slate-400">
                            You just finished a standard block. It's optimal to step back before diving in again.
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        onClick={onStartBreak}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-sm transition-colors"
                    >
                        5m Break
                    </button>
                    <button
                        onClick={onDismiss}
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded transition-colors"
                    >
                        Skip
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
