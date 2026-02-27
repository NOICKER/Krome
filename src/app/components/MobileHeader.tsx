import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabaseClient";
import { AuthModal } from "./auth/AuthModal";
import User from "lucide-react/dist/esm/icons/user";

interface MobileHeaderProps {
    title: string;
    potValue?: number;
}

export function MobileHeader({ title, potValue }: MobileHeaderProps) {
    const { user } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const hasAccount = typeof window !== 'undefined' && localStorage.getItem('krome_has_account') === 'true';

    return (
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#080C18]/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4">
            {/* Left: Small Logo */}
            <div className="flex items-center w-1/4">
                <img src="/k-icon.png" alt="Krome" className="h-5 w-auto object-contain" />
            </div>

            {/* Center: Title */}
            <div className="flex-1 flex justify-center items-center">
                <span className="text-sm font-bold text-slate-100 tracking-tight truncate px-2">{title}</span>
            </div>

            {/* Right: Pot & Auth Avatar */}
            <div className="flex items-center justify-end w-1/4 gap-2">


                <div className="relative">
                    {user ? (
                        <>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="h-7 w-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-bold text-kromeAccent uppercase"
                            >
                                {user.email ? user.email[0] : '?'}
                            </button>
                            {isDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50">
                                    <div className="px-2 pt-1 pb-1">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Signed in</p>
                                        <p className="text-xs text-slate-200 truncate mt-0.5">{user.email}</p>

                                        {potValue !== undefined && (
                                            <div className="mt-3 mb-1 flex justify-between items-center rounded-xl bg-slate-900/60 border border-slate-800 p-2">
                                                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Pot</span>
                                                <span className={`text-sm font-bold font-mono ${potValue > 0 ? 'text-kromeAccent' : potValue < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                                    {potValue > 0 ? `+${potValue}` : potValue}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="border-t border-slate-800 my-1" />
                                    <button
                                        onClick={async () => { setIsDropdownOpen(false); await supabase.auth.signOut(); }}
                                        className="w-full text-left px-3 py-2 text-sm font-semibold text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={() => setIsAuthModalOpen(true)}
                            className="h-7 w-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-slate-800 transition-colors"
                        >
                            <User size={12} className="text-slate-400" />
                        </button>
                    )}
                </div>
            </div>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </div>
    );
}
