/**
 * Hook for fetching all dashboard data in parallel
 * Eliminates the API waterfall by making all requests at once
 */

import { useEffect, useState } from 'react';
import { fetchJSON, allSettled } from '@/lib/net';

interface DashboardData {
  profile: any;
  balance: any;
  analytics: any;
  recentActivities: any;
  upcomingEvents: any;
  pendingCalls: any;
}

interface UseDashboardDataResult {
  loading: boolean;
  data: Partial<DashboardData>;
  error: string | null;
}

/**
 * Fetch all creator dashboard data in parallel
 * Returns loading state and data, never blocks rendering
 */
export function useDashboardData(): UseDashboardDataResult {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Partial<DashboardData>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // Single combined endpoint - all data fetched in parallel on server!
        const result = await fetchJSON<any>('/api/dashboard/summary', {}, 6000);

        if (cancelled) return;

        // Combine activities from multiple sources
        const activities: any[] = [];
        if (result?.recentCalls) {
          activities.push(...result.recentCalls.slice(0, 3).map((call: any) => ({
            ...call,
            type: 'call',
          })));
        }
        if (result?.recentStreams) {
          activities.push(...result.recentStreams.slice(0, 2).map((stream: any) => ({
            ...stream,
            type: 'stream',
          })));
        }

        // Combine upcoming events
        const events: any[] = [];
        if (result?.upcomingShows) {
          events.push(...result.upcomingShows.map((show: any) => ({
            ...show,
            type: 'show',
          })));
        }

        setData({
          profile: result?.profile ?? null,
          balance: result?.balance ?? 0,
          analytics: result?.analytics ?? null,
          recentActivities: activities.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
          upcomingEvents: events,
          pendingCalls: result?.pendingCalls ?? [],
        });
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load dashboard data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, data, error };
}
