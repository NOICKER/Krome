import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase, isSupabaseConfigured } from "../../services/supabaseClient";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    forceSignup?: boolean;
}

export function AuthModal({ isOpen, onClose, forceSignup }: AuthModalProps) {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const hasAccount = !forceSignup && typeof window !== 'undefined' && localStorage.getItem('krome_has_account') === 'true';

    const handleCancel = () => {
        if (window.location.search.includes('auth=signup')) {
            window.location.href = '/krome-landing.html';
        } else {
            onClose();
        }
    };

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setStatus("idle");
            setEmail("");
            setErrorMsg("");
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) handleCancel();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;

        document.body.classList.add("krome-modal-open");
        return () => document.body.classList.remove("krome-modal-open");
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || status === "loading") return;

        setStatus("loading");
        setErrorMsg("");

        if (!isSupabaseConfigured) {
            console.error("Magic Link Failed:", { message: "Supabase connection is unconfigured.", status: 500 });
            setStatus("error");
            setErrorMsg("Authentication service is not configured. Please contact support.");
            return;
        }

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin,
                },
            });

            if (error) {
                console.error("Magic Link Failed:", error, "\nStatus:", error.status);
                setStatus("error");
                setErrorMsg(error.message || "Failed to send magic link. Please try again.");
            } else {
                setStatus("success");
            }
        } catch (err: any) {
            console.error("Magic Link Network/Unknown Error:", err);
            setStatus("error");
            setErrorMsg("A network error occurred while connecting to the authentication service.");
        }
    };

    const handleGoogleLogin = async () => {
        if (!isSupabaseConfigured) {
            console.error("OAuth Failed:", { message: "Supabase connection is unconfigured.", status: 500 });
            setStatus("error");
            setErrorMsg("Authentication service is not configured. Please contact support.");
            return;
        }

        setStatus("loading");
        setErrorMsg("");

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                }
            });

            if (error) {
                console.error("OAuth Init Failed:", error, "\nStatus:", error.status);
                setErrorMsg(error.message || "Failed to initialize Google login.");
                setStatus("error");
            }
        } catch (err: any) {
            console.error("OAuth Network/Unknown Error:", err);
            setStatus("error");
            setErrorMsg("A network error occurred while initiating Google login.");
        }
    };

    if (!isOpen) return null;

    if (!isSupabaseConfigured) {
        return createPortal(
            <div data-krome-overlay="true" className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#080C18]/70 backdrop-blur-sm p-4">
                <div className="w-full max-w-[420px] bg-slate-900/95 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-800 shadow-2xl text-center">
                    <h2 className="text-xl font-bold tracking-tight text-slate-100 mb-3">Authentication temporarily unavailable</h2>
                    <p className="text-sm text-slate-400 mb-6">Authentication is disabled until the Supabase environment variables are configured.</p>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="w-full h-10 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-slate-700"
                    >
                        Close
                    </button>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <AnimatePresence>
            <div data-krome-overlay="true" className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#080C18]/70 backdrop-blur-sm p-4">
                {/* Click outside trigger */}
                <div className="absolute inset-0 z-0" onClick={handleCancel} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative z-10 w-full max-w-[420px] max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-slate-800 shadow-2xl"
                    role="dialog"
                    aria-modal="true"
                >
                    {status === "success" ? (
                        <div className="flex flex-col items-center justify-center space-y-6 text-center py-4">
                            <div className="w-12 h-12 rounded-full bg-kromeAccent/10 flex items-center justify-center mb-2">
                                <div className="w-2 h-2 rounded-full bg-kromeAccent shadow-[0_0_10px_rgba(98,105,157,0.8)]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold tracking-widest uppercase text-slate-200 mb-2">Login Link Sent</h3>
                                <p className="text-sm text-slate-400 font-medium">Check <span className="text-slate-200">{email}</span> for your secure access link.</p>
                            </div>
                            <div className="flex items-center space-x-4 pt-4 w-full">
                                <button
                                    onClick={() => setStatus("idle")}
                                    className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    Resend
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 py-3 rounded-xl bg-slate-800 text-xs font-bold uppercase tracking-widest text-slate-200 hover:bg-slate-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <div className="mb-6 text-center flex flex-col items-center">
                                <img src="/k-icon.png" alt="Krome Logo" className="w-12 h-12 mb-4 rounded-xl shadow-lg border border-slate-800" />
                                <h2 className="text-xl font-bold tracking-tight text-slate-100 mb-1">{hasAccount ? 'Welcome Back' : 'Create Account'}</h2>
                                <p className="text-sm text-slate-400">{hasAccount ? 'Sign in to access your mirror.' : 'Set up your identity to sync across devices.'}</p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                                <div className="space-y-1">
                                    <label htmlFor="auth-email" className="sr-only">Email address</label>
                                    <input
                                        ref={inputRef}
                                        id="auth-email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={status === "loading"}
                                        className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-kromeAccent/50 focus:ring-1 focus:ring-kromeAccent/50 transition-all disabled:opacity-50"
                                        required
                                    />
                                </div>

                                {status === "error" && (
                                    <p className="text-xs text-rose-400 font-medium px-2">{errorMsg}</p>
                                )}

                                <div className="pt-2 flex flex-col space-y-3">
                                    <button
                                        type="submit"
                                        disabled={status === "loading" || !email}
                                        className="w-full h-[48px] rounded-xl bg-kromeAccent hover:bg-kromeAccent/85 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                                    >
                                        {status === "loading" ? "Sending..." : "Send Magic Link"}
                                    </button>
                                </div>
                            </form>

                            <div className="flex items-center justify-center space-x-3 my-6">
                                <div className="h-px bg-slate-800 flex-1"></div>
                                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Or</span>
                                <div className="h-px bg-slate-800 flex-1"></div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={status === "loading"}
                                className="w-full h-[48px] rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center mb-4"
                            >
                                Continue with Google
                            </button>

                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={status === "loading"}
                                className="w-full h-10 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
