'use client';

import { Navigation } from '@/components/layout/Navigation';
import { useAuth } from '@/context/AuthContext';

export function AuthNavGate() {
  const { user, loading } = useAuth();

  // Debug logging
  console.log('[AuthNavGate] Render - loading:', loading, '| user:', user?.id || 'null');

  // While loading, render nothing to avoid flicker
  if (loading) return null;

  // Only render Navigation if user exists AND has an id
  if (!user?.id) {
    console.log('[AuthNavGate] No user, hiding Navigation');
    return null;
  }

  return <Navigation />;
}
