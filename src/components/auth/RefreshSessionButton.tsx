'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { refreshSession } from '@/lib/auth/refresh-session';

interface RefreshSessionButtonProps {
  onRefresh?: () => void;
  className?: string;
  variant?: 'text' | 'button' | 'icon';
}

/**
 * Button component to manually refresh the user's session.
 * Useful after role changes or when JWT needs to be updated.
 *
 * Usage:
 * ```tsx
 * <RefreshSessionButton onRefresh={() => window.location.reload()} />
 * ```
 */
export function RefreshSessionButton({
  onRefresh,
  className = '',
  variant = 'button'
}: RefreshSessionButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      const { success, error } = await refreshSession();

      if (success) {
        // Call optional callback (e.g., reload page or refetch user data)
        if (onRefresh) {
          onRefresh();
        } else {
          // Default: reload page to reflect new session
          window.location.reload();
        }
      } else {
        console.error('Failed to refresh session:', error);
        alert(`Failed to refresh session: ${error}`);
      }
    } catch (err) {
      console.error('Unexpected error refreshing session:', err);
      alert('Unexpected error refreshing session');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (variant === 'text') {
    return (
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`text-sm text-digis-cyan hover:text-digis-pink transition-colors disabled:opacity-50 ${className}`}
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh session'}
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 ${className}`}
        title="Refresh session"
      >
        <RefreshCw
          className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`}
        />
      </button>
    );
  }

  // Default: button variant
  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`flex items-center gap-2 px-4 py-2 bg-digis-cyan text-white rounded-lg hover:bg-digis-pink transition-colors disabled:opacity-50 ${className}`}
    >
      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      <span>{isRefreshing ? 'Refreshing...' : 'Refresh Session'}</span>
    </button>
  );
}
