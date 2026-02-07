/**
 * Analytics Wrapper Tests
 *
 * Tests the safe analytics tracking wrapper functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { track, identify, page, streamAnalytics } from '@/lib/utils/analytics';

describe('analytics', () => {
  let mockAnalytics: {
    track: ReturnType<typeof vi.fn>;
    identify: ReturnType<typeof vi.fn>;
    page: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAnalytics = {
      track: vi.fn(),
      identify: vi.fn(),
      page: vi.fn(),
    };
    vi.stubGlobal('window', { analytics: mockAnalytics });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('track', () => {
    it('calls window.analytics.track with event and properties', () => {
      track('test_event', { key: 'value' });
      expect(mockAnalytics.track).toHaveBeenCalledWith('test_event', { key: 'value' });
    });

    it('calls track with event name only', () => {
      track('simple_event');
      expect(mockAnalytics.track).toHaveBeenCalledWith('simple_event', undefined);
    });

    it('does not throw when window.analytics is undefined', () => {
      vi.stubGlobal('window', {});
      expect(() => track('test_event')).not.toThrow();
    });

    it('does not throw when analytics.track throws', () => {
      mockAnalytics.track.mockImplementation(() => { throw new Error('boom'); });
      expect(() => track('test_event')).not.toThrow();
    });
  });

  describe('identify', () => {
    it('calls window.analytics.identify with userId and traits', () => {
      identify('user-123', { name: 'John' });
      expect(mockAnalytics.identify).toHaveBeenCalledWith('user-123', { name: 'John' });
    });

    it('does not throw when window.analytics is undefined', () => {
      vi.stubGlobal('window', {});
      expect(() => identify('user-123')).not.toThrow();
    });

    it('does not throw when analytics.identify throws', () => {
      mockAnalytics.identify.mockImplementation(() => { throw new Error('boom'); });
      expect(() => identify('user-123')).not.toThrow();
    });
  });

  describe('page', () => {
    it('calls window.analytics.page with name and properties', () => {
      page('Home', { section: 'hero' });
      expect(mockAnalytics.page).toHaveBeenCalledWith('Home', { section: 'hero' });
    });

    it('does not throw when window.analytics is undefined', () => {
      vi.stubGlobal('window', {});
      expect(() => page('Home')).not.toThrow();
    });
  });

  describe('streamAnalytics', () => {
    it('tracks stream viewed inline', () => {
      streamAnalytics.viewedInline('johndoe', 'stream-1');
      expect(mockAnalytics.track).toHaveBeenCalledWith('stream_viewed_inline', {
        username: 'johndoe',
        streamId: 'stream-1',
      });
    });

    it('tracks theater mode clicked', () => {
      streamAnalytics.theaterModeClicked('johndoe', 'stream-1');
      expect(mockAnalytics.track).toHaveBeenCalledWith('theater_mode_clicked', {
        username: 'johndoe',
        streamId: 'stream-1',
      });
    });

    it('tracks quick tip sent', () => {
      streamAnalytics.quickTipSent('stream-1', 100);
      expect(mockAnalytics.track).toHaveBeenCalledWith('quick_tip_sent', {
        streamId: 'stream-1',
        amount: 100,
      });
    });

    it('tracks chat message sent', () => {
      streamAnalytics.chatMessageSent('stream-1');
      expect(mockAnalytics.track).toHaveBeenCalledWith('chat_message_sent', {
        streamId: 'stream-1',
      });
    });

    it('tracks player muted', () => {
      streamAnalytics.playerMuted('stream-1');
      expect(mockAnalytics.track).toHaveBeenCalledWith('player_muted', {
        streamId: 'stream-1',
      });
    });

    it('tracks player unmuted', () => {
      streamAnalytics.playerUnmuted('stream-1');
      expect(mockAnalytics.track).toHaveBeenCalledWith('player_unmuted', {
        streamId: 'stream-1',
      });
    });

    it('tracks mini player shown', () => {
      streamAnalytics.miniPlayerShown('stream-1');
      expect(mockAnalytics.track).toHaveBeenCalledWith('mini_player_shown', {
        streamId: 'stream-1',
      });
    });

    it('tracks private show purchased', () => {
      streamAnalytics.privateShowPurchased('johndoe', 'stream-1', 500);
      expect(mockAnalytics.track).toHaveBeenCalledWith('private_show_purchased', {
        username: 'johndoe',
        streamId: 'stream-1',
        price: 500,
      });
    });
  });
});
