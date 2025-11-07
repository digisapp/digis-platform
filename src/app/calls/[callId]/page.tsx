'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-react/styles';
import { Phone, PhoneOff, Loader2 } from 'lucide-react';

interface CallToken {
  token: string;
  roomName: string;
  participantName: string;
  wsUrl: string;
}

interface CallData {
  id: string;
  status: string;
  ratePerMinute: number;
  fan: {
    username: string;
    displayName: string;
  };
  creator: {
    username: string;
    displayName: string;
  };
}

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.callId as string;

  const [callToken, setCallToken] = useState<CallToken | null>(null);
  const [callData, setCallData] = useState<CallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Fetch call token and data
  useEffect(() => {
    const fetchCallData = async () => {
      try {
        // Get LiveKit token
        const tokenRes = await fetch(`/api/calls/${callId}/token`);
        if (!tokenRes.ok) {
          const errorData = await tokenRes.json();
          throw new Error(errorData.error || 'Failed to get call token');
        }
        const tokenData = await tokenRes.json();
        setCallToken(tokenData);

        // Get call details
        const callRes = await fetch(`/api/calls/${callId}`);
        if (!callRes.ok) {
          throw new Error('Failed to get call details');
        }
        const callDetails = await callRes.json();
        setCallData(callDetails.call);

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching call data:', err);
        setError(err.message || 'Failed to load call');
        setLoading(false);
      }
    };

    fetchCallData();
  }, [callId]);

  // Start call when connected
  const handleConnected = async () => {
    if (hasStarted) return;

    try {
      const res = await fetch(`/api/calls/${callId}/start`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Failed to start call:', errorData.error);
      } else {
        setHasStarted(true);
      }
    } catch (err) {
      console.error('Error starting call:', err);
    }
  };

  // Timer for duration and cost
  useEffect(() => {
    if (!hasStarted) return;

    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate estimated cost
  const estimatedCost = callData
    ? Math.ceil(duration / 60) * callData.ratePerMinute
    : 0;

  // End call
  const handleEndCall = async () => {
    if (isEnding) return;

    const confirmed = window.confirm('Are you sure you want to end this call?');
    if (!confirmed) return;

    setIsEnding(true);

    try {
      const res = await fetch(`/api/calls/${callId}/end`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to end call');
      }

      const result = await res.json();
      console.log('Call ended:', result);

      // Redirect to call history or dashboard
      router.push('/calls/history');
    } catch (err: any) {
      console.error('Error ending call:', err);
      alert('Failed to end call properly. Please try again.');
      setIsEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-digis-cyan animate-spin mx-auto mb-4" />
          <p className="text-white">Connecting to call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-4">
            <PhoneOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Call Error</h2>
            <p className="text-gray-400">{error}</p>
          </div>
          <button
            onClick={() => router.push('/calls/history')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Back to Calls
          </button>
        </div>
      </div>
    );
  }

  if (!callToken || !callData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Call Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">
                Video Call
              </h1>
              <p className="text-sm text-gray-400">
                {callData.fan.displayName || callData.fan.username} ↔️ {callData.creator.displayName || callData.creator.username}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Duration and Cost */}
              {hasStarted && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-digis-cyan font-mono">
                    {formatDuration(duration)}
                  </div>
                  <div className="text-sm text-gray-400">
                    ~{estimatedCost} coins
                  </div>
                </div>
              )}

              {/* End Call Button */}
              <button
                onClick={handleEndCall}
                disabled={isEnding}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                {isEnding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Ending...
                  </>
                ) : (
                  <>
                    <PhoneOff className="w-4 h-4" />
                    End Call
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Call Area */}
      <div className="pt-20 h-screen">
        <LiveKitRoom
          token={callToken.token}
          serverUrl={callToken.wsUrl}
          connect={true}
          onConnected={handleConnected}
          audio={true}
          video={true}
          className="h-full"
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}
