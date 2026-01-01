/**
 * Utility functions for extracting social media usernames from URLs or handles
 */

/**
 * Extract Instagram username from URL or handle
 * Handles:
 * - https://www.instagram.com/username
 * - https://instagram.com/username?igsh=xxx
 * - instagram.com/username
 * - @username
 * - username
 */
export function extractInstagramHandle(input: string): string {
  if (!input) return '';

  let handle = input.trim();

  // Remove @ prefix
  handle = handle.replace(/^@/, '');

  // Check if it's a URL
  if (handle.includes('instagram.com')) {
    try {
      // Add protocol if missing for URL parsing
      let url = handle;
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      const parsed = new URL(url);
      // Get the pathname and extract username (first segment after /)
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        // Skip 'p', 'reel', 'stories' etc - these are not usernames
        const reserved = ['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct'];
        if (!reserved.includes(pathParts[0].toLowerCase())) {
          handle = pathParts[0];
        }
      }
    } catch {
      // If URL parsing fails, try regex
      const match = handle.match(/instagram\.com\/([^/?#]+)/);
      if (match) {
        handle = match[1];
      }
    }
  }

  // Remove any remaining @ and trim
  return handle.replace(/^@/, '').trim();
}

/**
 * Extract TikTok username from URL or handle
 */
export function extractTiktokHandle(input: string): string {
  if (!input) return '';

  let handle = input.trim();

  // Remove @ prefix
  handle = handle.replace(/^@/, '');

  // Check if it's a URL
  if (handle.includes('tiktok.com')) {
    try {
      let url = handle;
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        // TikTok usernames in URLs start with @
        handle = pathParts[0].replace(/^@/, '');
      }
    } catch {
      const match = handle.match(/tiktok\.com\/@?([^/?#]+)/);
      if (match) {
        handle = match[1];
      }
    }
  }

  return handle.replace(/^@/, '').trim();
}

/**
 * Extract Twitter/X username from URL or handle
 */
export function extractTwitterHandle(input: string): string {
  if (!input) return '';

  let handle = input.trim();

  // Remove @ prefix
  handle = handle.replace(/^@/, '');

  // Check if it's a URL (twitter.com or x.com)
  if (handle.includes('twitter.com') || handle.includes('x.com')) {
    try {
      let url = handle;
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const reserved = ['home', 'explore', 'notifications', 'messages', 'settings', 'i'];
        if (!reserved.includes(pathParts[0].toLowerCase())) {
          handle = pathParts[0];
        }
      }
    } catch {
      const match = handle.match(/(?:twitter|x)\.com\/([^/?#]+)/);
      if (match) {
        handle = match[1];
      }
    }
  }

  return handle.replace(/^@/, '').trim();
}

/**
 * Extract Snapchat username from URL or handle
 */
export function extractSnapchatHandle(input: string): string {
  if (!input) return '';

  let handle = input.trim();

  // Remove @ prefix
  handle = handle.replace(/^@/, '');

  // Check if it's a URL
  if (handle.includes('snapchat.com')) {
    try {
      let url = handle;
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      // Snapchat URLs are like snapchat.com/add/username
      if (pathParts.length >= 2 && pathParts[0] === 'add') {
        handle = pathParts[1];
      } else if (pathParts.length > 0) {
        handle = pathParts[pathParts.length - 1];
      }
    } catch {
      const match = handle.match(/snapchat\.com\/(?:add\/)?([^/?#]+)/);
      if (match) {
        handle = match[1];
      }
    }
  }

  return handle.replace(/^@/, '').trim();
}

/**
 * Extract YouTube username/channel from URL or handle
 */
export function extractYoutubeHandle(input: string): string {
  if (!input) return '';

  let handle = input.trim();

  // Remove @ prefix
  handle = handle.replace(/^@/, '');

  // Check if it's a URL
  if (handle.includes('youtube.com') || handle.includes('youtu.be')) {
    try {
      let url = handle;
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      // YouTube URLs can be:
      // youtube.com/@username
      // youtube.com/c/channelname
      // youtube.com/channel/ID
      // youtube.com/user/username
      if (pathParts.length > 0) {
        if (pathParts[0].startsWith('@')) {
          handle = pathParts[0].substring(1);
        } else if (['c', 'channel', 'user'].includes(pathParts[0]) && pathParts.length > 1) {
          handle = pathParts[1];
        } else {
          handle = pathParts[0];
        }
      }
    } catch {
      const match = handle.match(/youtube\.com\/(?:@|c\/|channel\/|user\/)?([^/?#]+)/);
      if (match) {
        handle = match[1];
      }
    }
  }

  return handle.replace(/^@/, '').trim();
}
