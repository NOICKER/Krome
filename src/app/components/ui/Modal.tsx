// @ts-nocheck
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    allowClose?: boolean;
}

export function Modal({ isOpen, onClose, title, children, allowClose = true }: ModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#080C18]/80 backdrop-blur-sm"
                        onClick={allowClose ? onClose : undefined}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-md bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                            <h2 className="text-lg font-bold text-slate-100">{title}</h2>
                            {allowClose && (
                                <button
                                    onClick={onClose}
                                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
