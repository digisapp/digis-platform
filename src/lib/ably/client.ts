'use client';

import Ably from 'ably';

let ablyClient: Ably.Realtime | null = null;

/**
 * Get Ably client instance (singleton for browser)
 * Uses token auth for security - tokens are fetched from our API
 */
export function getAblyClient(): Ably.Realtime {
  if (typeof window === 'undefined') {
    throw new Error('Ably client can only be used in browser');
  }

  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      authUrl: '/api/ably/token',
      authMethod: 'GET',
      // Automatically reconnect on disconnect
      disconnectedRetryTimeout: 5000,
      suspendedRetryTimeout: 10000,
    });

    // Log connection state changes (remove in production if too noisy)
    ablyClient.connection.on('connected', () => {
      console.log('[Ably] Connected');
    });

    ablyClient.connection.on('disconnected', () => {
      console.log('[Ably] Disconnected, will retry...');
    });

    ablyClient.connection.on('failed', () => {
      console.error('[Ably] Connection failed');
    });
  }

  return ablyClient;
}

/**
 * Close Ably connection (call on logout or cleanup)
 */
export function closeAblyClient() {
  if (ablyClient) {
    ablyClient.close();
    ablyClient = null;
  }
}
