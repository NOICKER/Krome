import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Timer, Layers, ClipboardList, X } from "lucide-react";
import { getItem, setItem } from "../../services/storageService";

export function OnboardingModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hasSeen = getItem<boolean>('krome_intro_v3_seen', false);
        if (!hasSeen) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        setItem('krome_intro_v3_seen', true);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#080C18]/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="relative bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
                    >
                        {/* Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-kromeAccent/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                        <div className="relative z-10 flex flex-col space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Welcome to Krome</h2>
                                    <p className="text-sm font-medium uppercase tracking-widest text-slate-500 mt-1">How this works in 30 seconds</p>
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
                                    <div className="w-10 h-10 rounded-full bg-kromeAccent/10 flex items-center justify-center flex-shrink-0 text-kromeAccent mt-1">
                                        <Timer size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs mb-1">Blocks</h3>
                                        <p className="text-sm text-slate-400">You work in timed blocks (default: 25 minutes).<br />Finish the block → it counts.<br />Quit early → it counts against you.</p>
                                    </div>
                                </div>

                                <div className="flex space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-400 mt-1">
                                        <Layers size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs mb-1">Sessions</h3>
                                        <p className="text-sm text-slate-400">Multiple blocks form a session.<br />Sessions build your daily record.</p>
                                    </div>
                                </div>

                                <div className="flex space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-500 mt-1">
                                        <ClipboardList size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs mb-1">The Ledger</h3>
                                        <p className="text-sm text-slate-400">
                                            Krome tracks:<br />
                                            • What subject you worked on<br />
                                            • How many blocks you finished<br />
                                            • How often you quit
                                        </p>
                                        <p className="text-sm text-slate-500 mt-2">No streaks. No badges.<br />Just proof of whether you showed up.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 mt-2 border-t border-slate-800">
                                <button
                                    onClick={handleClose}
                                    className="w-full bg-kromeAccent hover:bg-kromeAccent/85 text-white font-bold tracking-widest uppercase py-3 rounded-xl transition-colors"
                                >
                                    Start Your First Block
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
