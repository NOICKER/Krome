import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Target, ShieldCheck, Zap, X } from "lucide-react";
import { getItem, setItem } from "../../services/storageService";

export function OnboardingModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hasSeen = getItem<boolean>('krome_has_seen_intro', false);
        if (!hasSeen) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        setItem('krome_has_seen_intro', true);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="relative bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                    >
                        {/* Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                        <div className="relative z-10 flex flex-col space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Krome</h2>
                                    <p className="text-sm font-medium uppercase tracking-widest text-slate-500 mt-1">System Initialized</p>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="p-2 text-slate-500 hover:text-slate-300 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-500 mt-1">
                                        <Target size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs mb-1">Unforgiving Retention</h3>
                                        <p className="text-sm text-slate-400">Lock in your sessions. Claim time back. If you abandon a session early, a spill is recorded and your metric pot penalizes you -20. Standard completion grants +10.</p>
                                    </div>
                                </div>

                                <div className="flex space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-400 mt-1">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs mb-1">Local & Deterministic</h3>
                                        <p className="text-sm text-slate-400">Your data never leaves your browser. Zero backend. Zero latency. Your history, configurations, and tasks are saved directly in local storage.</p>
                                    </div>
                                </div>

                                <div className="flex space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-500 mt-1">
                                        <Zap size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs mb-1">Clinical Execution</h3>
                                        <p className="text-sm text-slate-400">No gamification. No confetti. Just strict block tracking and neutral behavioral insights to expose your work patterns objectively.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 mt-2 border-t border-slate-800">
                                <button
                                    onClick={handleClose}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-widest uppercase py-3 rounded-xl transition-colors"
                                >
                                    Acknowledge & Begin
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
