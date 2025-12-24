'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Generate or retrieve a visitor ID (anonymous tracking)
function getVisitorId(): string {
  if (typeof window === 'undefined') return '';

  let visitorId = localStorage.getItem('digis_visitor_id');
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('digis_visitor_id', visitorId);
  }
  return visitorId;
}

// Extract creator username from path if it's a profile page
function getCreatorUsername(path: string): string | null {
  const segments = path.split('/').filter(Boolean);
  const reservedPaths = ['explore', 'live', 'settings', 'wallet', 'chats', 'admin', 'subscriptions', 'streams', 'content', 'connections', 'creator', 'stream', 'vod', 'calls', 'welcome', 'reset-password', 'privacy', 'terms', 'become-creator', 'dashboard'];

  if (segments.length === 1 && !reservedPaths.includes(segments[0])) {
    return segments[0];
  }
  return null;
}

export function usePageTracking() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    // Don't track if same path (prevents double tracking)
    if (pathname === lastTrackedPath.current) return;

    // Don't track admin pages or API routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return;

    lastTrackedPath.current = pathname;

    const trackPageView = async () => {
      try {
        const visitorId = getVisitorId();
        const creatorUsername = getCreatorUsername(pathname);

        await fetch('/api/track/pageview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: pathname,
            referrer: document.referrer || null,
            visitorId,
            creatorUsername,
          }),
        });
      } catch {
        // Silently fail - tracking shouldn't break the site
      }
    };

    // Small delay to ensure page has loaded
    const timer = setTimeout(trackPageView, 100);
    return () => clearTimeout(timer);
  }, [pathname]);
}
