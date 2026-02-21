import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
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

    useEffect(() => {
        // Initial session fetch
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error("Supabase session error:", error);
            }
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        }).catch((err) => {
            console.error("Unexpected error fetching session:", err);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                if (event === 'SIGNED_IN') {
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
