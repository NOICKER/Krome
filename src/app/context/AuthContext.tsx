import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    // Track whether user was null before current event to distinguish genuine sign-ins from token refreshes
    const previousUserRef = useRef<User | null>(null);
    const initialLoadDoneRef = useRef(false);

    useEffect(() => {
        if (!isSupabaseConfigured) {
            initialLoadDoneRef.current = true;
            setLoading(false);
            return;
        }

        // Initial session fetch
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error("Supabase session error:", error);
            }
            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            previousUserRef.current = currentUser;
            initialLoadDoneRef.current = true;
            setLoading(false);
        }).catch((err) => {
            console.error("Unexpected error fetching session:", err);
            initialLoadDoneRef.current = true;
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setSession(session);
                const newUser = session?.user ?? null;
                setUser(newUser);

                // Only show toast on genuine sign-in (user was null before) — not on token refresh / tab refocus
                if (event === 'SIGNED_IN' && initialLoadDoneRef.current && previousUserRef.current === null && newUser !== null) {
                    // Mark this device as having an account
                    try { localStorage.setItem('krome_has_account', 'true'); } catch { }
                    toast('Signed in', {
                        className: 'bg-slate-900 border-slate-800 text-slate-300 text-xs font-medium tracking-wide uppercase',
                        duration: 3000
                    });
                } else if (event === 'SIGNED_OUT') {
                    toast('Signed out', {
                        className: 'bg-slate-900 border-slate-800 text-slate-300 text-xs font-medium tracking-wide uppercase',
                        duration: 3000
                    });
                }

                previousUserRef.current = newUser;
            }
        );

        // Fail-safe: Ensure loading state is eventually released
        const timer = setTimeout(() => {
            setLoading(false);
        }, 2500);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

