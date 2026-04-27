// @ts-nocheck
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import X from "lucide-react/dist/esm/icons/x";
import { cn } from "./utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    allowClose?: boolean;
    panelClassName?: string;
    bodyClassName?: string;
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    allowClose = true,
    panelClassName = "",
    bodyClassName = "",
}: ModalProps) {
    useEffect(() => {
        if (!isOpen) return;

        document.body.classList.add("krome-modal-open");
        return () => document.body.classList.remove("krome-modal-open");
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <div data-krome-overlay="true" className="fixed inset-0 z-[9999] flex items-center justify-center px-4 overflow-hidden">
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
                    className={cn(
                        "relative flex max-h-[90vh] w-[95vw] max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl sm:w-full",
                        panelClassName,
                    )}
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
                    <div className={cn("overflow-y-auto custom-scrollbar p-6", bodyClassName)}>
                        {children}
                    </div>
                </motion.div>
                </div>
        </AnimatePresence>
        ,
        document.body
    );
}
