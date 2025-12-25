'use client';

import { Navigation } from '@/components/layout/Navigation';
import { useAuth } from '@/context/AuthContext';

export function AuthNavGate() {
  const { user, loading } = useAuth();

  // While loading, render nothing to avoid flicker
  if (loading) return null;

  // Paranoid check: only render if user exists AND has an id
  if (!user?.id) return null;

  return <Navigation />;
}
