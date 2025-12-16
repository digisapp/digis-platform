'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mic, X, Send, Lock, Coins } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

interface VoiceMessageButtonProps {
  onSend: (audioBlob: Blob, duration: number, unlockPrice?: number) => Promise<void>;
  isCreator?: boolean; // Only creators can charge for voice messages
}

export function VoiceMessageButton({ onSend, isCreator = false }: VoiceMessageButtonProps) {
  const { showError } = useToastContext();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [showPPVOptions, setShowPPVOptions] = useState(false);
  const [isPPV, setIsPPV] = useState(false);
  const [unlockPrice, setUnlockPrice] = useState(25);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [mounted, setMounted] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // For portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const cancelledRef = useRef<boolean>(false);

  const startRecording = async () => {
    try {
      cancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // If cancelled, don't do anything
        if (cancelledRef.current) {
          return;
        }

        // Store the recorded audio
        if (audioBlob.size > 0 && duration > 0) {
          if (isCreator) {
            // Creators see PPV options
            setRecordedBlob(audioBlob);
            setRecordedDuration(duration);
            setShowPPVOptions(true);
          } else {
            // Fans send directly without PPV option
            try {
              await onSend(audioBlob, duration);
            } catch (error) {
              console.error('Error sending voice message:', error);
              showError('Failed to send voice message');
            }
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      showError('Please allow microphone access to send voice messages');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    cancelledRef.current = true;

    if (mediaRecorderRef.current && isRecording) {
      // Stop all tracks first
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }

      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      audioChunksRef.current = [];

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleSend = async () => {
    if (!recordedBlob) return;

    setIsSending(true);
    try {
      await onSend(recordedBlob, recordedDuration, isPPV ? unlockPrice : undefined);
      // Reset state
      setShowPPVOptions(false);
      setRecordedBlob(null);
      setRecordedDuration(0);
      setIsPPV(false);
    } catch (error) {
      console.error('Error sending voice message:', error);
      showError('Failed to send voice message');
    } finally {
      setIsSending(false);
    }
  };

  const cancelSend = () => {
    setShowPPVOptions(false);
    setRecordedBlob(null);
    setRecordedDuration(0);
    setIsPPV(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // PPV Options Modal - render via portal to ensure proper centering
  if (showPPVOptions && mounted) {
    const modal = (
      <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
        <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/80 via-gray-900/90 to-black/80 rounded-3xl max-w-md w-full border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.3)] p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
              Voice Message
            </h3>
            <button
              onClick={cancelSend}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Audio Preview */}
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">Voice Message</p>
              <p className="text-sm text-gray-400">{formatTime(recordedDuration)}</p>
            </div>
          </div>

          {/* PPV Toggle */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsPPV(false)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  !isPPV
                    ? 'border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <Send className={`w-6 h-6 mx-auto mb-2 ${!isPPV ? 'text-green-400' : 'text-gray-400'}`} />
                <div className={`text-sm font-semibold ${!isPPV ? 'text-green-400' : 'text-white'}`}>Free</div>
              </button>

              <button
                onClick={() => setIsPPV(true)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isPPV
                    ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <Lock className={`w-6 h-6 mx-auto mb-2 ${isPPV ? 'text-purple-400' : 'text-gray-400'}`} />
                <div className={`text-sm font-semibold ${isPPV ? 'text-purple-400' : 'text-white'}`}>PPV</div>
              </button>
            </div>

            {/* Price Input */}
            {isPPV && (
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-cyan-500/20">
                  <Coins className="w-5 h-5 text-cyan-400" />
                </div>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={unlockPrice}
                  onChange={(e) => setUnlockPrice(parseInt(e.target.value) || 1)}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-semibold focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                />
                <span className="text-gray-300 font-medium">coins</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={cancelSend}
              className="flex-1 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isSending ? (
                'Sending...'
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modal, document.body);
  }

  // Recording UI
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-red-500/20 border-2 border-red-500 rounded-full px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-400 font-semibold">{formatTime(recordingTime)}</span>
        </div>

        <button
          type="button"
          onClick={cancelRecording}
          className="p-2 hover:bg-red-500/20 rounded-full transition-colors"
          title="Cancel"
        >
          <X className="w-5 h-5 text-red-400" />
        </button>

        <button
          type="button"
          onClick={stopRecording}
          disabled={recordingTime < 1}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full font-semibold hover:scale-105 transition-transform disabled:opacity-50"
        >
          Done
        </button>
      </div>
    );
  }

  // Default mic button
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={isSending}
      className="p-3 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 hover:border-cyan-500/50 transition-all flex items-center justify-center disabled:opacity-50"
      title="Record voice message"
    >
      <Mic className="w-6 h-6 text-white" />
    </button>
  );
}
