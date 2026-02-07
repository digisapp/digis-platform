/**
 * Social Media Handle Extraction Tests
 *
 * Tests extracting usernames from various URL formats and handle inputs.
 * Pure functions - no network dependencies.
 */

import { describe, it, expect } from 'vitest';
import {
  extractInstagramHandle,
  extractTiktokHandle,
  extractTwitterHandle,
  extractSnapchatHandle,
  extractYoutubeHandle,
} from '@/lib/utils/social-handles';

describe('extractInstagramHandle', () => {
  it('returns empty string for empty input', () => {
    expect(extractInstagramHandle('')).toBe('');
  });

  it('extracts from plain username', () => {
    expect(extractInstagramHandle('johndoe')).toBe('johndoe');
  });

  it('strips @ prefix', () => {
    expect(extractInstagramHandle('@johndoe')).toBe('johndoe');
  });

  it('extracts from full URL', () => {
    expect(extractInstagramHandle('https://www.instagram.com/johndoe')).toBe('johndoe');
  });

  it('extracts from URL without www', () => {
    expect(extractInstagramHandle('https://instagram.com/johndoe')).toBe('johndoe');
  });

  it('extracts from URL without protocol', () => {
    expect(extractInstagramHandle('instagram.com/johndoe')).toBe('johndoe');
  });

  it('extracts from URL with query params', () => {
    expect(extractInstagramHandle('https://instagram.com/johndoe?igsh=abc')).toBe('johndoe');
  });

  it('skips reserved paths like /p/ and /reel/', () => {
    // When the path is /p/ or /reel/, the function won't extract it as a username
    const result = extractInstagramHandle('https://instagram.com/p/ABC123');
    expect(result).not.toBe('p');
  });

  it('trims whitespace', () => {
    expect(extractInstagramHandle('  johndoe  ')).toBe('johndoe');
  });
});

describe('extractTiktokHandle', () => {
  it('returns empty string for empty input', () => {
    expect(extractTiktokHandle('')).toBe('');
  });

  it('extracts from plain username', () => {
    expect(extractTiktokHandle('johndoe')).toBe('johndoe');
  });

  it('strips @ prefix', () => {
    expect(extractTiktokHandle('@johndoe')).toBe('johndoe');
  });

  it('extracts from full URL', () => {
    expect(extractTiktokHandle('https://www.tiktok.com/@johndoe')).toBe('johndoe');
  });

  it('extracts from URL without @', () => {
    expect(extractTiktokHandle('https://tiktok.com/johndoe')).toBe('johndoe');
  });

  it('extracts from URL without protocol', () => {
    expect(extractTiktokHandle('tiktok.com/@johndoe')).toBe('johndoe');
  });

  it('handles URL with query params', () => {
    expect(extractTiktokHandle('https://tiktok.com/@johndoe?lang=en')).toBe('johndoe');
  });
});

describe('extractTwitterHandle', () => {
  it('returns empty string for empty input', () => {
    expect(extractTwitterHandle('')).toBe('');
  });

  it('extracts from plain username', () => {
    expect(extractTwitterHandle('johndoe')).toBe('johndoe');
  });

  it('strips @ prefix', () => {
    expect(extractTwitterHandle('@johndoe')).toBe('johndoe');
  });

  it('extracts from twitter.com URL', () => {
    expect(extractTwitterHandle('https://twitter.com/johndoe')).toBe('johndoe');
  });

  it('extracts from x.com URL', () => {
    expect(extractTwitterHandle('https://x.com/johndoe')).toBe('johndoe');
  });

  it('extracts from URL without protocol', () => {
    expect(extractTwitterHandle('twitter.com/johndoe')).toBe('johndoe');
    expect(extractTwitterHandle('x.com/johndoe')).toBe('johndoe');
  });

  it('skips reserved paths', () => {
    const result = extractTwitterHandle('https://twitter.com/home');
    expect(result).not.toBe('home');
  });

  it('handles URL with query params', () => {
    expect(extractTwitterHandle('https://twitter.com/johndoe?ref=123')).toBe('johndoe');
  });
});

describe('extractSnapchatHandle', () => {
  it('returns empty string for empty input', () => {
    expect(extractSnapchatHandle('')).toBe('');
  });

  it('extracts from plain username', () => {
    expect(extractSnapchatHandle('johndoe')).toBe('johndoe');
  });

  it('strips @ prefix', () => {
    expect(extractSnapchatHandle('@johndoe')).toBe('johndoe');
  });

  it('extracts from /add/ URL', () => {
    expect(extractSnapchatHandle('https://www.snapchat.com/add/johndoe')).toBe('johndoe');
  });

  it('extracts from URL without /add/', () => {
    expect(extractSnapchatHandle('https://snapchat.com/johndoe')).toBe('johndoe');
  });

  it('extracts from URL without protocol', () => {
    expect(extractSnapchatHandle('snapchat.com/add/johndoe')).toBe('johndoe');
  });
});

describe('extractYoutubeHandle', () => {
  it('returns empty string for empty input', () => {
    expect(extractYoutubeHandle('')).toBe('');
  });

  it('extracts from plain username', () => {
    expect(extractYoutubeHandle('johndoe')).toBe('johndoe');
  });

  it('strips @ prefix', () => {
    expect(extractYoutubeHandle('@johndoe')).toBe('johndoe');
  });

  it('extracts from @username URL', () => {
    expect(extractYoutubeHandle('https://youtube.com/@johndoe')).toBe('johndoe');
  });

  it('extracts from /c/ channel URL', () => {
    expect(extractYoutubeHandle('https://youtube.com/c/johndoe')).toBe('johndoe');
  });

  it('extracts from /channel/ URL', () => {
    expect(extractYoutubeHandle('https://youtube.com/channel/UCxyz123')).toBe('UCxyz123');
  });

  it('extracts from /user/ URL', () => {
    expect(extractYoutubeHandle('https://youtube.com/user/johndoe')).toBe('johndoe');
  });

  it('extracts from URL without protocol', () => {
    expect(extractYoutubeHandle('youtube.com/@johndoe')).toBe('johndoe');
  });

  it('handles URL with query params', () => {
    expect(extractYoutubeHandle('https://youtube.com/@johndoe?sub=1')).toBe('johndoe');
  });
});
