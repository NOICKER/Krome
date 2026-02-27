import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";
import { AuthModal } from "../auth/AuthModal";
import { User } from "lucide-react";

interface DashboardHeaderProps {
    date: string;
    streak: number;
    potValue: number;
    strictMode: boolean;
    isActive: boolean;
}

export function DashboardHeader({ date, streak, potValue, strictMode, isActive }: DashboardHeaderProps) {
    const { user } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const hasAccount = typeof window !== 'undefined' && localStorage.getItem('krome_has_account') === 'true';

    return (
        <div className="w-full hidden md:flex flex-row items-center justify-between bg-[#080C18] pb-0 md:pb-6 border-b border-slate-800/50 mb-4 md:mb-6 h-16 md:h-auto overflow-hidden flex-nowrap min-w-0 max-w-full">
            <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-shrink flex-nowrap overflow-hidden pr-2">
                <img src="/k-icon.png" alt="Krome Icon" className="h-5 md:h-10 w-auto object-contain flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                    <h1 className="text-lg md:text-2xl font-display font-bold tracking-tight text-slate-100 truncate">Overview</h1>
                    <p className="text-xs md:text-sm text-slate-500 truncate hidden md:block">{date}</p>
                </div>
            </div>

            <div className="flex items-center gap-4 md:gap-6 flex-shrink-0 flex-nowrap overflow-hidden">
                <div className="hidden md:flex items-center gap-6 flex-shrink-0">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest leading-none mb-1">Streak</span>
                        <span className="text-lg font-mono text-kromeAccent leading-none">{streak}</span>
                    </div>

                    {strictMode && potValue !== 0 && (
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest leading-none mb-1">Pot</span>
                            <span className="text-lg font-mono text-amber-500 leading-none">{potValue}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Status</span>
                        <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-kromeAccent/20 text-kromeAccent' : 'bg-slate-800 text-slate-400'}`}>
                            {isActive ? 'FOCUSING' : 'IDLE'}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-6 w-px bg-slate-800 mx-1" />
                </div>

                {/* Pot pill */}
                <div className="flex items-center space-x-1 border-slate-800 md:space-x-2 rounded-full bg-slate-900 border px-2 py-1 md:px-4 md:py-1.5 flex-shrink-0">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500 hidden md:inline">Pot</span>
                    <span className={`text-xs md:text-sm font-bold font-mono ${potValue > 0 ? 'text-kromeAccent' : potValue < 0 ? 'text-red-400' : 'text-amber-500'}`}>
                        {potValue > 0 ? `+${potValue}` : potValue}
                    </span>
                </div>

                {/* Profile / Auth */}
                <div className="relative flex-shrink-0">
                    {user ? (
                        <>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center space-x-0 md:space-x-2 rounded-full bg-slate-900 border border-slate-800 p-0.5 md:px-3 md:py-1.5 text-sm transition-colors hover:bg-slate-800 flex-shrink-0"
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
                            className="flex items-center space-x-1 md:space-x-1.5 rounded-full bg-slate-900 border border-slate-800 px-2 py-1 md:px-3 md:py-1.5 text-xs font-bold uppercase tracking-widest text-slate-300 transition-colors hover:bg-slate-800 flex-shrink-0"
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

