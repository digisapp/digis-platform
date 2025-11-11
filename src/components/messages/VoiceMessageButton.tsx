'use client';

import { useState, useRef } from 'react';
import { Mic, X } from 'lucide-react';

interface VoiceMessageButtonProps {
  onSend: (audioBlob: Blob, duration: number) => Promise<void>;
}

export function VoiceMessageButton({ onSend }: VoiceMessageButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = async () => {
    try {
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

        if (!isSending && audioBlob.size > 0 && duration > 0) {
          setIsSending(true);
          try {
            await onSend(audioBlob, duration);
          } catch (error) {
            console.error('Error sending voice message:', error);
            alert('Failed to send voice message');
          } finally {
            setIsSending(false);
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
      alert('Please allow microphone access to send voice messages');
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
    if (mediaRecorderRef.current && isRecording) {
      // Stop recording without sending
      mediaRecorderRef.current.stop();

      // Stop all tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }

      setIsRecording(false);
      setRecordingTime(0);
      audioChunksRef.current = [];

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-red-500/20 border-2 border-red-500 rounded-full px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-600 font-semibold">{formatTime(recordingTime)}</span>
        </div>

        <button
          onClick={cancelRecording}
          className="p-2 hover:bg-red-500/20 rounded-full transition-colors"
          title="Cancel"
        >
          <X className="w-5 h-5 text-red-600" />
        </button>

        <button
          onClick={stopRecording}
          disabled={recordingTime < 1}
          className="px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 rounded-full font-semibold hover:scale-105 transition-transform disabled:opacity-50"
        >
          Send
        </button>
      </div>
    );
  }

  return (
    <button
      onMouseDown={startRecording}
      onTouchStart={startRecording}
      disabled={isSending}
      className="p-3 bg-white/60 border border-purple-200 rounded-full hover:bg-white/80 hover:border-digis-cyan transition-all flex items-center justify-center disabled:opacity-50"
      title="Hold to record voice message"
    >
      <Mic className="w-6 h-6 text-gray-700" />
    </button>
  );
}
