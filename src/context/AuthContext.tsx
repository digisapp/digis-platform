'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string | undefined;
  username: string | null;
  displayName: string | null;
  role: 'fan' | 'creator' | 'admin' | null;
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

    // Check for admin emails
    const isAdminEmail = authUser.email === 'admin@digis.cc' || authUser.email === 'nathan@digis.cc';

    // Role priority: metadata role > admin email check > null
    // The login API syncs DB role to metadata, so metadata should be accurate
    const role = metadata.role || (isAdminEmail ? 'admin' : null);

    return {
      id: authUser.id,
      email: authUser.email,
      username: metadata.username || authUser.email?.split('@')[0] || null,
      displayName: metadata.display_name || metadata.username || null,
      role,
      isCreatorVerified: !!metadata.isCreatorVerified,
      avatarUrl: metadata.avatar_url || null,
    };
  };

  // Initial session load - instant from local storage
  useEffect(() => {
    const supabase = createClient();

    // Get session instantly from local storage
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setSession(session);
          setUser(extractUserFromSession(session));
        }
      } catch (error) {
        console.error('[AuthContext] Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event);
        setSession(session);
        setUser(extractUserFromSession(session));
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Optional: Refine user data from API in background (non-blocking)
  useEffect(() => {
    if (!session?.user || !user) return;

    const refineUserData = async () => {
      try {
        const response = await fetch('/api/user/me', {
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(prev => ({
              ...prev!,
              role: data.user.role || prev?.role,
              username: data.user.username || prev?.username,
              displayName: data.user.displayName || prev?.displayName,
              isCreatorVerified: data.user.isCreatorVerified ?? prev?.isCreatorVerified,
              avatarUrl: data.user.avatarUrl || prev?.avatarUrl,
            }));
          }
        }
      } catch (error) {
        // Silently fail - we already have metadata as fallback
        console.warn('[AuthContext] Background refresh failed:', error);
      }
    };

    // Delay background refinement to not block initial render
    const timer = setTimeout(refineUserData, 1000);
    return () => clearTimeout(timer);
  }, [session?.user?.id]);

  const refresh = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(extractUserFromSession(session));
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
    isCreator: user?.role === 'creator',
    isAdmin: user?.role === 'admin',
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
