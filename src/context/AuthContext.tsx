'use client';

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { closeAblyClient } from '@/lib/ably/client';
import type { Session } from '@supabase/supabase-js';

// CRITICAL: Create a single shared Supabase client instance at module level
// This ensures AuthProvider and all other components use the SAME client
// so onAuthStateChange events are received properly
const supabase = createClient();

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
    let mounted = true;

    // 1. Initial fetch from storage
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error('[AuthContext] getSession error:', error);
        setLoading(false);
        return;
      }

      const currentSession = data.session;
      setSession(currentSession);
      setUser(currentSession ? extractUserFromSession(currentSession) : null);
      setLoading(false);
    });

    // 2. Listen for auth changes on the SAME supabase instance
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        // Debug logging - should see SIGNED_OUT when logout happens
        console.log('[AuthContext] Auth event:', event, '| Has user:', !!newSession?.user);

        // Update state based on new session
        setSession(newSession);
        setUser(newSession ? extractUserFromSession(newSession) : null);
        setLoading(false);

        // Close real-time connections on logout
        if (event === 'SIGNED_OUT') {
          closeAblyClient();
        }
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
      const { data: { session: newSession } } = await supabase.auth.getSession();
      setSession(newSession);
      setUser(newSession ? extractUserFromSession(newSession) : null);
    } catch (error) {
      console.error('[AuthContext] Error refreshing:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] signOut called');

    // Sign out using the SAME supabase instance that AuthProvider is subscribed to
    // This will trigger onAuthStateChange with SIGNED_OUT event, which will:
    // 1. Set user/session to null
    // 2. Close Ably connections
    // The UI will update automatically via the subscription
    await supabase.auth.signOut();

    console.log('[AuthContext] signOut complete');
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
