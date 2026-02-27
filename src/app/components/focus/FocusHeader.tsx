import { format } from "date-fns";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";
import { AuthModal } from "../auth/AuthModal";
import User from "lucide-react/dist/esm/icons/user";

interface FocusHeaderProps {
    potValue: number;
}

export function FocusHeader({ potValue }: FocusHeaderProps) {
    const { user } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const hasAccount = typeof window !== 'undefined' && localStorage.getItem('krome_has_account') === 'true';

    const now = new Date();
    const timeString = format(now, 'HH:mm');
    const dateString = format(now, 'EEEE, MMMM do');

    return (
        <div className="hidden md:flex flex-row items-center justify-between w-full max-w-[980px] mx-auto px-4 md:px-8 py-3 md:py-4 border-b border-slate-900 mb-4 md:mb-6 h-16 md:h-auto overflow-hidden flex-nowrap min-w-0 max-w-full">
            {/* Left: Time & Date */}
            <div className="flex items-center min-w-0 md:min-w-[220px] flex-shrink flex-nowrap overflow-hidden pr-2 space-x-2 md:space-x-4">
                <img src="/k-icon.png" alt="Krome" className="h-5 md:h-8 w-auto object-contain flex-shrink-0" />
                <div className="flex flex-col gap-0.5 md:gap-1 min-w-0">
                    <span className="text-xl md:text-3xl font-display font-semibold text-slate-100 tracking-tight leading-none truncate">
                        {timeString}
                    </span>
                    <span className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-widest truncate hidden md:block">
                        {dateString}
                    </span>
                </div>
            </div>

            {/* Right: Pot Badge + Auth */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 flex-nowrap overflow-hidden">
                {/* Pot Badge */}
                <div className="group relative cursor-help flex-shrink-0">
                    <div className="flex items-center space-x-1 border-slate-800 md:space-x-2 rounded-full bg-slate-900/60 border px-2 py-1 md:px-4 md:py-1.5 text-sm transition-colors group-hover:bg-slate-800/60">
                        <span className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-widest hidden md:inline">Pot</span>
                        <span className="text-kromeAccent font-mono font-bold text-xs md:text-sm">
                            {potValue > 0 ? `+${potValue}` : potValue}
                        </span>
                    </div>
                    <div className="absolute top-10 right-0 w-48 bg-slate-800 border border-slate-700/80 rounded-lg p-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                        <p className="text-[10px] text-slate-300 font-medium tracking-wide text-center">
                            <span className="text-kromeAccent">Retained</span> – <span className="text-amber-500">Spilled</span> = Pot
                        </p>
                    </div>
                </div>

                {/* Auth */}
                <div className="relative flex-shrink-0">
                    {user ? (
                        <>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center space-x-0 md:space-x-2 rounded-full bg-slate-900/60 border border-slate-800 p-0.5 md:px-3 md:py-1.5 text-sm transition-colors hover:bg-slate-800/60 flex-shrink-0"
                            >
                                <div className="h-6 w-6 rounded-full bg-kromeAccent/20 flex items-center justify-center text-xs font-bold text-kromeAccent uppercase flex-shrink-0">
                                    {user.email ? user.email[0] : '?'}
                                </div>
                                <span className="text-slate-300 text-xs font-medium truncate max-w-[120px] hidden md:block">
                                    {user.email}
                                </span>
                            </button>
                            {isDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50">
                                    <div className="px-2 pt-1 pb-1">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Signed in as</p>
                                        <p className="text-sm text-slate-200 truncate mt-0.5">{user.email}</p>
                                    </div>
                                    <div className="border-t border-slate-800 my-2" />
                                    <button
                                        onClick={async () => { setIsDropdownOpen(false); await supabase.auth.signOut(); }}
                                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={() => setIsAuthModalOpen(true)}
                            className="flex items-center space-x-1 md:space-x-1.5 rounded-full bg-slate-900/60 border border-slate-800 px-2 py-1 md:px-3 md:py-1.5 text-xs font-bold uppercase tracking-widest text-slate-300 hover:bg-slate-800/60 transition-colors flex-shrink-0"
                        >
                            <User size={13} className="text-slate-400 flex-shrink-0" />
                            <span className="hidden md:inline">{hasAccount ? 'Sign In' : 'Sign Up'}</span>
                            <span className="md:hidden">In</span>
                        </button>
                    )}
                </div>
            </div>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </div>
    );
}


