'use client';

import { useState, useEffect } from 'react';
import { Video, Mic, X, Loader2, CheckCircle } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';

interface GuestRequestButtonProps {
  streamId: string;
  guestRequestsEnabled: boolean;
  isHost: boolean;
  onRequestAccepted?: () => void;
}

type RequestStatus = 'none' | 'pending' | 'accepted' | 'active' | 'rejected';

export function GuestRequestButton({
  streamId,
  guestRequestsEnabled,
  isHost,
  onRequestAccepted,
}: GuestRequestButtonProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  // Check for existing request on mount
  useEffect(() => {
    if (!isHost && guestRequestsEnabled) {
      checkExistingRequest();
    }
  }, [isHost, guestRequestsEnabled, streamId]);

  const checkExistingRequest = async () => {
    try {
      const res = await fetch(`/api/streams/${streamId}/guest`);
      if (res.ok) {
        const data = await res.json();
        if (data.myRequest) {
          setRequestId(data.myRequest.id);
          setRequestStatus(data.myRequest.status as RequestStatus);

          // If accepted, trigger the callback
          if (data.myRequest.status === 'accepted') {
            onRequestAccepted?.();
          }
        }
      }
    } catch (error) {
      console.error('Failed to check existing request:', error);
    }
  };

  const handleRequest = async (type: 'video' | 'voice') => {
    setIsLoading(true);
    setShowOptions(false);

    try {
      const res = await fetch(`/api/streams/${streamId}/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: type }),
      });

      const data = await res.json();

      if (res.ok) {
        setRequestId(data.request.id);
        setRequestStatus('pending');
      } else {
        console.error('Request failed:', data.error);
      }
    } catch (error) {
      console.error('Failed to send request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);

    try {
      const res = await fetch(`/api/streams/${streamId}/guest`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setRequestStatus('none');
        setRequestId(null);
      }
    } catch (error) {
      console.error('Failed to cancel request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show for host or if guest requests are disabled
  if (isHost || !guestRequestsEnabled) {
    return null;
  }

  // Show status based on current request state
  if (requestStatus === 'pending') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
          <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
          <span className="text-sm text-yellow-400 font-medium">Request Pending...</span>
        </div>
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (requestStatus === 'accepted') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-xl animate-pulse">
        <CheckCircle className="w-4 h-4 text-green-400" />
        <span className="text-sm text-green-400 font-medium">Accepted! Connecting...</span>
      </div>
    );
  }

  if (requestStatus === 'active') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl">
        <Video className="w-4 h-4 text-cyan-400" />
        <span className="text-sm text-cyan-400 font-medium">You're Live!</span>
      </div>
    );
  }

  if (requestStatus === 'rejected') {
    return (
      <button
        onClick={() => setRequestStatus('none')}
        className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl"
      >
        <X className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-400 font-medium">Request Declined</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <GlassButton
        variant="ghost"
        size="sm"
        onClick={() => setShowOptions(!showOptions)}
        disabled={isLoading}
        className="!bg-purple-500/20 !border-purple-500/30 hover:!bg-purple-500/30"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Video className="w-4 h-4 mr-2 text-purple-400" />
            <span className="text-purple-400">Join Stream</span>
          </>
        )}
      </GlassButton>

      {/* Options Dropdown */}
      {showOptions && (
        <div className="absolute bottom-full mb-2 right-0 w-48 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-xl overflow-hidden z-50">
          <button
            onClick={() => handleRequest('video')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors"
          >
            <Video className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-sm font-medium text-white">Video Call</div>
              <div className="text-xs text-gray-400">Camera & Mic</div>
            </div>
          </button>
          <button
            onClick={() => handleRequest('voice')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors border-t border-white/10"
          >
            <Mic className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-sm font-medium text-white">Voice Only</div>
              <div className="text-xs text-gray-400">Mic Only</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
