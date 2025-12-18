'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const XAI_WEBSOCKET_URL = 'wss://api.x.ai/v1/realtime';
const SAMPLE_RATE = 24000;

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type SpeakingState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface UseAiVoiceChatOptions {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAiResponse?: (text: string) => void;
  onError?: (error: string) => void;
  onStateChange?: (state: ConnectionState) => void;
}

interface SessionConfig {
  voice: string;
  instructions: string;
  turn_detection: { type: string };
  audio: {
    input: { format: { type: string; rate: number } };
    output: { format: { type: string; rate: number } };
  };
  tools: Array<{ type: string; name?: string; description?: string; parameters?: object }>;
}

export function useAiVoiceChat(options: UseAiVoiceChatOptions = {}) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [speakingState, setSpeakingState] = useState<SpeakingState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const connectingRef = useRef(false); // Prevent concurrent connection attempts
  const connectionStateRef = useRef<ConnectionState>('disconnected'); // Stable ref for guards

  const updateState = useCallback((state: ConnectionState) => {
    connectionStateRef.current = state;
    setConnectionState(state);
    options.onStateChange?.(state);
  }, [options]);

  // Convert base64 to Float32Array (PCM 16-bit to float)
  const base64ToFloat32 = useCallback((base64: string): Float32Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert PCM 16-bit to Float32
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    return float32Array;
  }, []);

  // Convert Float32Array to base64 (float to PCM 16-bit)
  const float32ToBase64 = useCallback((float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  }, []);

  // Play audio queue
  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    if (!audioContextRef.current) return;

    isPlayingRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()!;
      const buffer = audioContextRef.current.createBuffer(1, audioData.length, SAMPLE_RATE);
      buffer.getChannelData(0).set(audioData);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start();

      // Wait for the audio to finish playing
      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
      });
    }

    isPlayingRef.current = false;
    if (speakingState === 'speaking' && audioQueueRef.current.length === 0) {
      setSpeakingState('listening');
    }
  }, [speakingState]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'session.created':
          console.log('[AI Voice] Session created');
          break;

        case 'session.updated':
          console.log('[AI Voice] Session updated');
          break;

        case 'input_audio_buffer.speech_started':
          setSpeakingState('listening');
          break;

        case 'input_audio_buffer.speech_stopped':
          setSpeakingState('thinking');
          break;

        case 'conversation.item.input_audio_transcription.delta':
          if (message.delta) {
            options.onTranscript?.(message.delta, false);
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          if (message.transcript) {
            options.onTranscript?.(message.transcript, true);
          }
          break;

        case 'response.audio_transcript.delta':
          if (message.delta) {
            options.onAiResponse?.(message.delta);
          }
          break;

        case 'response.audio.delta':
          if (message.delta) {
            setSpeakingState('speaking');
            const audioData = base64ToFloat32(message.delta);
            audioQueueRef.current.push(audioData);
            playAudioQueue();
          }
          break;

        case 'response.audio.done':
          if (audioQueueRef.current.length === 0) {
            setSpeakingState('listening');
          }
          break;

        case 'response.function_call_arguments.done':
          // Handle function calls (tips, subscription check, etc.)
          console.log('[AI Voice] Function call:', message.name, message.arguments);
          // TODO: Implement function call handlers
          break;

        case 'error':
          console.error('[AI Voice] Error:', message.error);
          setError(message.error?.message || 'Unknown error');
          options.onError?.(message.error?.message || 'Unknown error');
          break;

        default:
          // Log unhandled message types for debugging
          if (message.type) {
            console.log('[AI Voice] Unhandled message type:', message.type);
          }
      }
    } catch (err) {
      console.error('[AI Voice] Failed to parse message:', err);
    }
  }, [base64ToFloat32, playAudioQueue, options]);

  // Setup audio capture
  const setupAudioCapture = useCallback(async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });

      // Create audio worklet for capturing audio
      await audioContextRef.current.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob(
            [
              `
              class AudioCaptureProcessor extends AudioWorkletProcessor {
                constructor() {
                  super();
                  this.buffer = [];
                  this.bufferSize = 4800; // 200ms at 24kHz
                }

                process(inputs, outputs, parameters) {
                  const input = inputs[0];
                  if (input.length > 0) {
                    const channelData = input[0];
                    this.buffer.push(...channelData);

                    if (this.buffer.length >= this.bufferSize) {
                      const audioData = new Float32Array(this.buffer.splice(0, this.bufferSize));
                      this.port.postMessage(audioData);
                    }
                  }
                  return true;
                }
              }

              registerProcessor('audio-capture-processor', AudioCaptureProcessor);
            `,
            ],
            { type: 'application/javascript' }
          )
        )
      );

      // Create source from microphone
      const source = audioContextRef.current.createMediaStreamSource(stream);

      // Create worklet node
      workletNodeRef.current = new AudioWorkletNode(
        audioContextRef.current,
        'audio-capture-processor'
      );

      // Handle captured audio
      workletNodeRef.current.port.onmessage = (event) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && !isMuted) {
          const audioData = event.data as Float32Array;
          const base64Audio = float32ToBase64(audioData);

          wsRef.current.send(
            JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64Audio,
            })
          );
        }
      };

      // Connect the audio pipeline
      source.connect(workletNodeRef.current);

      return true;
    } catch (err) {
      console.error('[AI Voice] Failed to setup audio:', err);
      setError('Failed to access microphone');
      return false;
    }
  }, [float32ToBase64, isMuted]);

  // Connect to xAI
  const connect = useCallback(
    async (creatorId: string) => {
      // Prevent concurrent connection attempts using refs (stable, not affected by re-renders)
      if (connectingRef.current || connectionStateRef.current !== 'disconnected') {
        console.log('[AI Voice] Connection already in progress or connected, skipping');
        return;
      }

      connectingRef.current = true;
      updateState('connecting');
      setError(null);

      try {
        // 1. Get ephemeral token from our API
        const tokenResponse = await fetch('/api/ai/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creatorId }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          throw new Error(errorData.error || 'Failed to get token');
        }

        const tokenData = await tokenResponse.json();
        console.log('[AI Voice] Token response:', tokenData);

        // Handle different possible response structures from xAI
        const token = tokenData.client_secret?.value ||
                      tokenData.secret?.value ||
                      tokenData.token ||
                      tokenData.value;
        const sessionConfig = tokenData.sessionConfig;

        if (!token) {
          console.error('[AI Voice] Token data received:', tokenData);
          throw new Error('Invalid token response - no token found');
        }

        // 2. Start session record (with improved 409 handling)
        let sessionId: string | null = null;
        const startSession = async (retryCount = 0): Promise<string> => {
          const maxRetries = 2;
          const useForceCleanup = retryCount > 0;

          const sessionResponse = await fetch('/api/ai/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creatorId,
              voice: sessionConfig.voice.toLowerCase(),
              forceCleanup: useForceCleanup,
            }),
          });

          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            return sessionData.session.id;
          }

          const errorData = await sessionResponse.json();

          // If there's an existing session conflict, retry with forceCleanup
          if (sessionResponse.status === 409) {
            if (retryCount < maxRetries) {
              console.log(`[AI Voice] Session conflict (attempt ${retryCount + 1}/${maxRetries}), retrying with forceCleanup:`, errorData.sessionId);
              // Small delay before retry to allow any in-flight requests to complete
              await new Promise(resolve => setTimeout(resolve, 500));
              return startSession(retryCount + 1);
            } else {
              console.error('[AI Voice] Session conflict persists after retries:', errorData.sessionId);
              throw new Error('Unable to start session - please wait a moment and try again');
            }
          }

          throw new Error(errorData.error || 'Failed to start session');
        };

        sessionId = await startSession();
        sessionIdRef.current = sessionId;

        // 3. Setup audio capture
        const audioSetup = await setupAudioCapture();
        if (!audioSetup) {
          throw new Error('Failed to setup audio');
        }

        // 4. Connect to xAI WebSocket
        const ws = new WebSocket(`${XAI_WEBSOCKET_URL}?model=grok-2-public`);

        ws.onopen = () => {
          console.log('[AI Voice] WebSocket connected');

          // Authenticate with ephemeral token
          ws.send(
            JSON.stringify({
              type: 'session.update',
              session: {
                ...sessionConfig,
                input_audio_transcription: { model: 'whisper-1' },
              },
            })
          );

          // Send authorization
          ws.send(
            JSON.stringify({
              type: 'authenticate',
              authorization: `Bearer ${token}`,
            })
          );

          updateState('connected');
          setSpeakingState('listening');
          connectingRef.current = false; // Connection complete
        };

        ws.onmessage = handleMessage;

        ws.onerror = (event) => {
          console.error('[AI Voice] WebSocket error:', event);
          setError('Connection error');
          updateState('error');
          connectingRef.current = false;
        };

        ws.onclose = () => {
          console.log('[AI Voice] WebSocket closed');
          updateState('disconnected');
          setSpeakingState('idle');
          connectingRef.current = false;
        };

        wsRef.current = ws;
      } catch (err) {
        console.error('[AI Voice] Connection failed:', err);
        setError(err instanceof Error ? err.message : 'Connection failed');
        updateState('error');
        options.onError?.(err instanceof Error ? err.message : 'Connection failed');
        connectingRef.current = false; // Reset on error
      }
    },
    [updateState, setupAudioCapture, handleMessage, options]
  );

  // Disconnect
  const disconnect = useCallback(async () => {
    // Reset connecting state
    connectingRef.current = false;

    // End session record
    if (sessionIdRef.current) {
      try {
        await fetch(`/api/ai/session/${sessionIdRef.current}/end`, {
          method: 'POST',
        });
      } catch (err) {
        console.error('[AI Voice] Failed to end session:', err);
      }
      sessionIdRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop audio capture
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Disconnect worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    updateState('disconnected');
    setSpeakingState('idle');
  }, [updateState]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    speakingState,
    isMuted,
    error,
    connect,
    disconnect,
    toggleMute,
    sessionId: sessionIdRef.current,
  };
}
