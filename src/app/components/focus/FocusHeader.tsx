import { format } from "date-fns";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";
import { AuthModal } from "../auth/AuthModal";

interface FocusHeaderProps {
    potValue: number;
}

export function FocusHeader({ potValue }: FocusHeaderProps) {
    const { user } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const now = new Date();
    const timeString = format(now, 'HH:mm');
    const dateString = format(now, 'EEEE, MMMM do');

    return (
        <div className="flex items-center justify-between w-full max-w-[980px] mx-auto px-8 py-4 border-b border-slate-900 mb-6">
            {/* Left: Time & Date */}
            <div className="flex items-center min-w-[220px] flex-shrink-0 gap-4">
                <img src="/logo.png" alt="Krome" className="w-8 h-8 rounded-lg border border-slate-800 shadow-sm" />
                <div className="flex flex-col gap-1">
                    <span className="text-3xl font-semibold text-slate-100 tracking-tight leading-none">
                        {timeString}
                    </span>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                        {dateString}
                    </span>
                </div>
            </div>

            {/* Middle: Removed Toggle */}
            <div className="flex-1 flex justify-center">
            </div>

            {/* Right: Pot Badge + Auth Capsule */}
            <div className="flex justify-end items-center min-w-[220px] flex-shrink-0 gap-3">

                {/* Pot Badge */}
                <div className="group relative cursor-help">
                    <div className="flex items-center space-x-2 rounded-full bg-slate-900/60 border border-slate-800 px-4 py-1.5 text-sm transition-colors group-hover:bg-slate-800/60">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                            Pot
                        </span>
                        <span className="text-emerald-400 font-mono font-bold">
                            {potValue > 0 ? `+${potValue}` : potValue}
                        </span>
                    </div>

                    {/* Tooltip */}
                    <div className="absolute top-10 right-0 w-48 bg-slate-800 border border-slate-700/80 rounded-lg p-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                        <p className="text-[10px] text-slate-300 font-medium tracking-wide text-center">
                            <span className="text-emerald-400">Retained</span> – <span className="text-amber-500">Spilled</span> = Pot
                        </p>
                    </div>
                </div>

                {/* Auth UI Capsule */}
                <div className="relative">
                    {user ? (
                        <>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center space-x-2 rounded-full bg-slate-900/60 border border-slate-800 px-4 py-1.5 text-sm transition-colors hover:bg-slate-800/60"
                            >
                                <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-300 uppercase">
                                    {user.email ? user.email[0] : '?'}
                                </div>
                                <span className="text-slate-200 transition-colors truncate max-w-[140px]">
                                    {user.email} ▾
                                </span>
                            </button>

                            {/* Sign Out Dropdown */}
                            {isDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-lg p-2 z-50 overflow-hidden">
                                    <div className="px-2 pt-1 pb-1">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            Signed in as
                                        </p>
                                        <p className="text-sm text-slate-200 truncate mt-0.5">
                                            {user.email}
                                        </p>
                                    </div>

                                    <div className="border-t border-slate-800 my-2"></div>

                                    <button
                                        onClick={async () => {
                                            setIsDropdownOpen(false);
                                            await supabase.auth.signOut();
                                        }}
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
                            className="flex items-center rounded-full bg-slate-900/60 border border-slate-800 px-4 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-800/60"
                        >
                            Sign In
                        </button>
                    )}
                </div>
            </div>



            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />
        </div>
    );
}
