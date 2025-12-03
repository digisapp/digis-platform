'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Extract user data from session metadata (instant, no DB call)
  const extractUserFromSession = (session: Session | null): AuthUser | null => {
    if (!session?.user) return null;

    const authUser = session.user;
    const metadata = authUser.user_metadata || {};

    // Check for admin emails (fallback check)
    const isAdminEmail = authUser.email === 'admin@digis.cc' || authUser.email === 'nathan@digis.cc';

    // Role priority: metadata role > fan (default)
    // Note: role is separate from isAdmin - a creator can also be an admin
    const role = metadata.role || 'fan';

    // isAdmin can be set via metadata.isAdmin OR if user is an admin email
    const isAdmin = metadata.isAdmin || isAdminEmail || role === 'admin';

    return {
      id: authUser.id,
      email: authUser.email,
      username: metadata.username || authUser.email?.split('@')[0] || null,
      displayName: metadata.display_name || metadata.username || null,
      role,
      isAdmin,
      isCreatorVerified: !!metadata.isCreatorVerified,
      avatarUrl: metadata.avatar_url || null,
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

        // SIGNED_OUT: clear everything
        if (event === 'SIGNED_OUT') {
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

  const value: AuthContextType = {
    user,
    session,
    loading,
    isCreator: user?.role === 'creator' || user?.role === 'admin', // Admins can do creator things
    isAdmin: user?.isAdmin || false, // Use the isAdmin flag, not role
    isFan: user?.role === 'fan' || (!user?.role && !!user),
    refresh,
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
