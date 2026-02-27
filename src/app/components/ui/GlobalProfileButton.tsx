import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";
import { AuthModal } from "../auth/AuthModal";
import { User } from "lucide-react";

export function GlobalProfileButton() {
    const { user } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Detect if user has ever signed in on this device
    const hasAccount = typeof window !== 'undefined' && localStorage.getItem('krome_has_account') === 'true';

    // Auto-close auth modal when user signs in (e.g. after Google OAuth redirect)
    useEffect(() => {
        if (user && isAuthModalOpen) {
            setIsAuthModalOpen(false);
        }
    }, [user]);

    // Close dropdown on outside click
    useEffect(() => {
        if (!isDropdownOpen) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-profile-dropdown]')) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [isDropdownOpen]);

    return (
        <>
            <div className="fixed top-3 right-[5.5rem] md:top-4 md:right-28 z-50" data-profile-dropdown>
                {user ? (
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center space-x-2 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 text-sm transition-colors hover:bg-slate-800/80 shadow-lg"
                        >
                            <div className="h-6 w-6 rounded-full bg-kromeAccent/20 flex items-center justify-center text-xs font-bold text-kromeAccent uppercase">
                                {user.email ? user.email[0] : '?'}
                            </div>
                            <span className="text-slate-300 text-xs font-medium truncate max-w-[120px] hidden md:inline">
                                {user.email}
                            </span>
                        </button>

                        {/* Sign Out Dropdown */}
                        {isDropdownOpen && (
                            <div className="absolute top-full right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 overflow-hidden">
                                <div className="px-2 pt-1 pb-1">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
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
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="flex items-center space-x-2 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 text-sm transition-colors hover:bg-slate-800/80 shadow-lg"
                    >
                        <User size={14} className="text-slate-400" />
                        <span className="text-slate-300 text-xs font-bold uppercase tracking-widest">
                            {hasAccount ? 'Sign In' : 'Sign Up'}
                        </span>
                    </button>
                )}
            </div>

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />
        </>
    );
}
