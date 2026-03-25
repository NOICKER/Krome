import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "../services/supabaseClient";
import {
  clearLocalPersistence,
  getDatasetOwnerId,
  setDatasetOwnerId,
} from "../services/storageService";

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

const AUTH_HASH_KEYS = new Set([
  "access_token",
  "expires_at",
  "expires_in",
  "refresh_token",
  "token_type",
  "type",
]);

const AUTH_QUERY_KEYS = new Set([
  "code",
  "error",
  "error_code",
  "error_description",
  "provider_token",
  "provider_refresh_token",
]);

function clearAuthArtifactsFromUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  let changed = false;

  for (const key of [...hashParams.keys()]) {
    if (AUTH_HASH_KEYS.has(key)) {
      hashParams.delete(key);
      changed = true;
    }
  }

  for (const key of [...url.searchParams.keys()]) {
    if (AUTH_QUERY_KEYS.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  if (!changed) return;

  const nextHash = hashParams.toString();
  const nextSearch = url.searchParams.toString();
  const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}${nextHash ? `#${nextHash}` : ""}`;
  window.history.replaceState(window.history.state, document.title, nextUrl);
}

async function reconcileLocalPersistenceForUser(userId: string) {
  const datasetOwnerId = getDatasetOwnerId();

  if (!datasetOwnerId) {
    setDatasetOwnerId(userId);
    return false;
  }

  if (datasetOwnerId === userId) {
    return false;
  }

  await clearLocalPersistence();
  setDatasetOwnerId(userId);
  window.location.reload();
  return true;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Track whether user was null before current event to distinguish genuine sign-ins from token refreshes.
  const previousUserRef = useRef<User | null>(null);
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      initialLoadDoneRef.current = true;
      setLoading(false);
      return;
    }

    // Initial session fetch
    supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          console.error("Supabase session error:", error);
        }

        const currentUser = session?.user ?? null;
        if (currentUser) {
          const didReload = await reconcileLocalPersistenceForUser(currentUser.id);
          if (didReload) {
            return;
          }
          clearAuthArtifactsFromUrl();
        }

        setSession(session);
        setUser(currentUser);
        previousUserRef.current = currentUser;
        initialLoadDoneRef.current = true;
        setLoading(false);
      })
      .catch((error) => {
        console.error("Unexpected error fetching session:", error);
        initialLoadDoneRef.current = true;
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;

      if (event === "SIGNED_OUT") {
        setSession(session);
        setUser(null);
        previousUserRef.current = null;
        toast("Signed out", {
          className: "bg-slate-900 border-slate-800 text-slate-300 text-xs font-medium tracking-wide uppercase",
          duration: 3000,
        });
        return;
      }

      void (async () => {
        if (nextUser) {
          const didReload = await reconcileLocalPersistenceForUser(nextUser.id);
          if (didReload) {
            return;
          }
          clearAuthArtifactsFromUrl();
        }

        setSession(session);
        setUser(nextUser);

        // Only show toast on genuine sign-in (user was null before) and after ownership is reconciled.
        if (
          event === "SIGNED_IN" &&
          initialLoadDoneRef.current &&
          previousUserRef.current === null &&
          nextUser !== null
        ) {
          try {
            localStorage.setItem("krome_has_account", "true");
          } catch {
            // Ignore localStorage write failures.
          }

          toast("Signed in", {
            className: "bg-slate-900 border-slate-800 text-slate-300 text-xs font-medium tracking-wide uppercase",
            duration: 3000,
          });
        }

        previousUserRef.current = nextUser;
      })();
    });

    // Fail-safe: Ensure loading state is eventually released.
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return <AuthContext.Provider value={{ user, session, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
