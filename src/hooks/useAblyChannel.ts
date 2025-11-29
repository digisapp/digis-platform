'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getAblyClient } from '@/lib/ably/client';
import type Ably from 'ably';

interface UseAblyChannelOptions {
  channelName: string;
  onMessage?: (message: Ably.Message) => void;
  onPresenceEnter?: (member: Ably.PresenceMessage) => void;
  onPresenceLeave?: (member: Ably.PresenceMessage) => void;
  trackPresence?: boolean;
  presenceData?: any;
}

interface UseAblyChannelReturn {
  channel: Ably.RealtimeChannel | null;
  publish: (event: string, data: any) => Promise<void>;
  presenceCount: number;
  isConnected: boolean;
  error: Error | null;
}

/**
 * React hook for subscribing to Ably channels
 * Handles connection, subscription, presence, and cleanup
 */
export function useAblyChannel({
  channelName,
  onMessage,
  onPresenceEnter,
  onPresenceLeave,
  trackPresence = false,
  presenceData,
}: UseAblyChannelOptions): UseAblyChannelReturn {
  const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null);
  const [presenceCount, setPresenceCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use refs to avoid stale closures in callbacks
  const onMessageRef = useRef(onMessage);
  const onPresenceEnterRef = useRef(onPresenceEnter);
  const onPresenceLeaveRef = useRef(onPresenceLeave);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onPresenceEnterRef.current = onPresenceEnter;
    onPresenceLeaveRef.current = onPresenceLeave;
  }, [onMessage, onPresenceEnter, onPresenceLeave]);

  useEffect(() => {
    let mounted = true;
    let ablyChannel: Ably.RealtimeChannel | null = null;

    const setupChannel = async () => {
      try {
        const ably = getAblyClient();

        // Wait for connection
        if (ably.connection.state !== 'connected') {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
            ably.connection.once('connected', () => {
              clearTimeout(timeout);
              resolve();
            });
            ably.connection.once('failed', () => {
              clearTimeout(timeout);
              reject(new Error('Connection failed'));
            });
          });
        }

        if (!mounted) return;

        ablyChannel = ably.channels.get(channelName);
        setChannel(ablyChannel);
        setIsConnected(true);

        // Subscribe to all messages
        ablyChannel.subscribe((message) => {
          if (onMessageRef.current) {
            onMessageRef.current(message);
          }
        });

        // Handle presence if enabled
        if (trackPresence) {
          // Enter presence
          if (presenceData) {
            await ablyChannel.presence.enter(presenceData);
          } else {
            await ablyChannel.presence.enter();
          }

          // Get initial presence count
          const members = await ablyChannel.presence.get();
          if (mounted) {
            setPresenceCount(members.length);
          }

          // Subscribe to presence events
          ablyChannel.presence.subscribe('enter', (member) => {
            if (mounted) {
              setPresenceCount((prev) => prev + 1);
              if (onPresenceEnterRef.current) {
                onPresenceEnterRef.current(member);
              }
            }
          });

          ablyChannel.presence.subscribe('leave', (member) => {
            if (mounted) {
              setPresenceCount((prev) => Math.max(0, prev - 1));
              if (onPresenceLeaveRef.current) {
                onPresenceLeaveRef.current(member);
              }
            }
          });
        }
      } catch (err) {
        console.error('[useAblyChannel] Setup error:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setIsConnected(false);
        }
      }
    };

    setupChannel();

    return () => {
      mounted = false;
      if (ablyChannel) {
        // Leave presence before unsubscribing
        if (trackPresence) {
          ablyChannel.presence.leave().catch(() => {});
        }
        ablyChannel.unsubscribe();
        ablyChannel.detach().catch(() => {});
      }
    };
  }, [channelName, trackPresence, presenceData]);

  const publish = useCallback(
    async (event: string, data: any) => {
      if (!channel) {
        throw new Error('Channel not connected');
      }
      await channel.publish(event, data);
    },
    [channel]
  );

  return {
    channel,
    publish,
    presenceCount,
    isConnected,
    error,
  };
}
