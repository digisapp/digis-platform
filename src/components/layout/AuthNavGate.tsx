'use client';

import { Navigation } from '@/components/layout/Navigation';
import { useAuth } from '@/context/AuthContext';

export function AuthNavGate() {
  const { user, loading } = useAuth();

  // While loading, render nothing to avoid flicker
  if (loading) return null;

  // Only render Navigation when user is logged in
  return user ? <Navigation /> : null;
}
