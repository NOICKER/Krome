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
        <div className="w-full flex md:flex-row flex-col items-start md:items-center justify-between bg-slate-950 pb-6 border-b border-slate-800/50 mb-6">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <img src="/logo.png" alt="Krome Logo" className="w-10 h-10 rounded-xl border border-slate-800 shadow-lg" />
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-100">Overview</h1>
                    <p className="text-sm text-slate-500">{date}</p>
                </div>
            </div>

            <div className="flex items-center gap-5">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest leading-none mb-1">Streak</span>
                    <span className="text-lg font-mono text-emerald-400 leading-none">{streak}</span>
                </div>

                {strictMode && (
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest leading-none mb-1">Pot</span>
                        <span className="text-lg font-mono text-amber-500 leading-none">{potValue}</span>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Status</span>
                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {isActive ? 'FOCUSING' : 'IDLE'}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-800" />

                {/* Profile / Auth */}
                <div className="relative">
                    {user ? (
                        <>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center space-x-2 rounded-full bg-slate-900 border border-slate-800 px-3 py-1.5 text-sm transition-colors hover:bg-slate-800"
                            >
                                <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 uppercase">
                                    {user.email ? user.email[0] : '?'}
                                </div>
                                <span className="text-slate-300 text-xs font-medium truncate max-w-[120px]">
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
                            className="flex items-center space-x-1.5 rounded-full bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-300 transition-colors hover:bg-slate-800"
                        >
                            <User size={13} className="text-slate-400" />
                            <span>{hasAccount ? 'Sign In' : 'Sign Up'}</span>
                        </button>
                    )}
                </div>
            </div>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </div>
    );
}

