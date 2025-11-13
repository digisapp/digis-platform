// Analytics tracking utilities
// Integrates with any analytics provider (Segment, Mixpanel, PostHog, etc.)

declare global {
  interface Window {
    analytics?: {
      track: (event: string, properties?: Record<string, any>) => void;
      identify: (userId: string, traits?: Record<string, any>) => void;
      page: (name?: string, properties?: Record<string, any>) => void;
    };
  }
}

/**
 * Track an analytics event
 * Safe to call even if analytics not initialized
 */
export const track = (event: string, properties?: Record<string, any>) => {
  try {
    if (typeof window !== 'undefined' && window.analytics?.track) {
      window.analytics.track(event, properties);
    }
    // Fallback: log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event, properties);
    }
  } catch (error) {
    console.error('[Analytics] Track error:', error);
  }
};

/**
 * Identify a user
 */
export const identify = (userId: string, traits?: Record<string, any>) => {
  try {
    if (typeof window !== 'undefined' && window.analytics?.identify) {
      window.analytics.identify(userId, traits);
    }
  } catch (error) {
    console.error('[Analytics] Identify error:', error);
  }
};

/**
 * Track a page view
 */
export const page = (name?: string, properties?: Record<string, any>) => {
  try {
    if (typeof window !== 'undefined' && window.analytics?.page) {
      window.analytics.page(name, properties);
    }
  } catch (error) {
    console.error('[Analytics] Page error:', error);
  }
};

// Convenience functions for common stream events
export const streamAnalytics = {
  viewedInline: (username: string, streamId: string) =>
    track('stream_viewed_inline', { username, streamId }),

  theaterModeClicked: (username: string, streamId: string) =>
    track('theater_mode_clicked', { username, streamId }),

  privateShowPurchased: (username: string, streamId: string, price: number) =>
    track('private_show_purchased', { username, streamId, price }),

  quickTipSent: (streamId: string, amount: number) =>
    track('quick_tip_sent', { streamId, amount }),

  playerMuted: (streamId: string) =>
    track('player_muted', { streamId }),

  playerUnmuted: (streamId: string) =>
    track('player_unmuted', { streamId }),

  miniPlayerShown: (streamId: string) =>
    track('mini_player_shown', { streamId }),

  chatMessageSent: (streamId: string) =>
    track('chat_message_sent', { streamId }),
};
