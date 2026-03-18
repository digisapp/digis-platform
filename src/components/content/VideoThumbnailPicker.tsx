'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, RotateCcw } from 'lucide-react';
import { generateVideoThumbnail, ThumbnailResult } from '@/lib/utils/video-thumbnail';

interface VideoThumbnailPickerProps {
  videoFile: File;
  thumbnail: ThumbnailResult | null;
  onThumbnailChange: (_thumbnail: ThumbnailResult) => void;
  generating: boolean;
  setGenerating: (_g: boolean) => void;
}

export function VideoThumbnailPicker({
  videoFile,
  thumbnail,
  onThumbnailChange,
  generating,
  setGenerating,
}: VideoThumbnailPickerProps) {
  const [duration, setDuration] = useState(0);
  const [scrubTime, setScrubTime] = useState(0);
  const [useCustomImage, setUseCustomImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  // Get video duration on mount and sync scrubber to initial thumbnail position
  useEffect(() => {
    initializedRef.current = false;
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.onloadedmetadata = () => {
      const dur = video.duration;
      setDuration(dur);
      // Match the default seek time from generateVideoThumbnail
      if (!initializedRef.current) {
        const initialTime = Math.min(dur * 0.1, 1);
        setScrubTime(initialTime);
        initializedRef.current = true;
      }
      URL.revokeObjectURL(url);
    };
    video.onerror = () => URL.revokeObjectURL(url);
    video.load();

    return () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  // Generate thumbnail at specific time
  const generateAt = useCallback(async (time: number) => {
    setGenerating(true);
    try {
      const result = await generateVideoThumbnail(videoFile, time);
      onThumbnailChange(result);
      setUseCustomImage(false);
    } catch (err) {
      console.error('Failed to generate thumbnail at time:', time, err);
    } finally {
      setGenerating(false);
    }
  }, [videoFile, onThumbnailChange, setGenerating]);

  // Handle scrubber change
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setScrubTime(time);
  };

  // Generate on scrub end (mouseup/touchend) to avoid spamming
  const handleScrubEnd = () => {
    generateAt(scrubTime);
  };

  // Handle custom image upload
  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;

      // Convert to blob for upload
      fetch(dataUrl)
        .then(r => r.blob())
        .then(blob => {
          // Get dimensions from image
          const img = new Image();
          img.onload = () => {
            onThumbnailChange({
              blob,
              dataUrl,
              width: img.width,
              height: img.height,
            });
            setUseCustomImage(true);
          };
          img.src = dataUrl;
        });
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-3 bg-white/5 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">Thumbnail</span>
        {useCustomImage && (
          <button
            type="button"
            onClick={() => generateAt(scrubTime)}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Use video frame
          </button>
        )}
      </div>

      {/* Thumbnail preview */}
      <div className="flex items-start gap-3">
        <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-black/50 flex-shrink-0">
          {generating ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : thumbnail ? (
            <img
              src={thumbnail.dataUrl}
              alt="Thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="w-5 h-5 text-gray-500" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Scrubber */}
          {duration > 0 && !useCustomImage && (
            <div>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={scrubTime}
                onChange={handleScrub}
                onMouseUp={handleScrubEnd}
                onTouchEnd={handleScrubEnd}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                disabled={generating}
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                <span>{formatTime(scrubTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {/* Upload custom button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/10"
          >
            <Upload className="w-3 h-3" />
            {useCustomImage ? 'Change custom image' : 'Upload custom image'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCustomUpload}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
