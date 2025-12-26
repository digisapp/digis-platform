'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { closeAblyClient } from '@/lib/ably/client';
import type { Session } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string | undefined;
  username: string | null;
  displayName: string | null;
  role: 'fan' | 'creator' | 'admin' | null;
  isAdmin: boolean; // Separate flag - user can be creator AND admin
  isCreatorVerified: boolean;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  isFan: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Extract user data from session metadata (instant, no DB call)
  // SECURITY: Admin status comes ONLY from app_metadata.isAdmin (synced from DB)
  // No hardcoded email lists - server enforces actual admin access via DB
  const extractUserFromSession = (session: Session | null): AuthUser | null => {
    if (!session?.user) return null;

    const authUser = session.user;
    const appMeta = (authUser.app_metadata || {}) as Record<string, any>;
    const userMeta = (authUser.user_metadata || {}) as Record<string, any>;

    // Role priority: app_metadata (server-set, authoritative) > user_metadata > 'fan'
    const role = appMeta.role || userMeta.role || 'fan';

    // isAdmin comes from app_metadata (synced from DB isAdmin flag) or legacy role
    const isAdmin = appMeta.isAdmin === true || role === 'admin';

    return {
      id: authUser.id,
      email: authUser.email,
      username: userMeta.username || authUser.email?.split('@')[0] || null,
      displayName: userMeta.display_name || userMeta.username || null,
      role,
      isAdmin,
      isCreatorVerified: !!userMeta.is_creator_verified || !!userMeta.isCreatorVerified,
      avatarUrl: userMeta.avatar_url || appMeta.avatar_url || null,
    };
  };

  // Initial session load and auth state management
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    // 1. Initial fetch from storage
    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('[AuthContext] getSession error:', error);
          setLoading(false);
          return;
        }

        const currentSession = data.session;
        if (currentSession) {
          setSession(currentSession);
          setUser(extractUserFromSession(currentSession));
        }
      } catch (error) {
        console.error('[AuthContext] Error getting session:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // 2. Listen for auth changes - handle events properly
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        console.log('[AuthContext] Auth event:', event);

        // INITIAL_SESSION: sync current state, don't treat as logout
        if (event === 'INITIAL_SESSION') {
          setSession(newSession);
          setUser(extractUserFromSession(newSession));
          setLoading(false);
          return;
        }

        // SIGNED_IN or TOKEN_REFRESHED: update with new session
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(newSession);
          setUser(extractUserFromSession(newSession));
          setLoading(false);
          return;
        }

        // SIGNED_OUT: clear everything and cleanup connections
        if (event === 'SIGNED_OUT') {
          closeAblyClient(); // Close real-time connection on logout
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // Any other event: just sync state without clearing
        if (newSession) {
          setSession(newSession);
          setUser(extractUserFromSession(newSession));
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session: newSession } } = await supabase.auth.getSession();
      setSession(newSession);
      setUser(extractUserFromSession(newSession));
    } catch (error) {
      console.error('[AuthContext] Error refreshing:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] signOut called');

    // 1) IMMEDIATELY clear local state so UI hides navigation right away
    setUser(null);
    setSession(null);
    setLoading(false);

    // 2) Close real-time connections
    closeAblyClient();

    // 3) Tell Supabase to sign out (clears server-side session)
    const supabase = createClient();
    await supabase.auth.signOut({ scope: 'global' });

    // 4) Clear all client-side storage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();

      // Clear cookies manually
      document.cookie.split(';').forEach(c => {
        const cookie = c.trim();
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    }

    console.log('[AuthContext] signOut complete - forcing page reload');

    // 5) Force navigation to home with cache-busting query param
    window.location.href = '/?signout=' + Date.now();
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    isCreator: user?.role === 'creator' || user?.role === 'admin', // Admins can do creator things
    isAdmin: user?.isAdmin || false, // Use the isAdmin flag, not role
    isFan: user?.role === 'fan' || (!user?.role && !!user),
    refresh,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Optional hook for components that need auth but can work without it
export function useOptionalAuth() {
  return useContext(AuthContext);
}
