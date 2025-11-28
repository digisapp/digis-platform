'use client';

import { useState } from 'react';
import { X, Image, Video, Lock, Eye, Coins } from 'lucide-react';

interface MediaAttachmentModalProps {
  onClose: () => void;
  onSend: (data: {
    file: File;
    caption: string;
    isLocked: boolean;
    unlockPrice: number;
  }) => Promise<void>;
}

export function MediaAttachmentModal({ onClose, onSend }: MediaAttachmentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPrice, setUnlockPrice] = useState(25);
  const [sending, setSending] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file type
    const type = selectedFile.type.startsWith('image/') ? 'image' :
                 selectedFile.type.startsWith('video/') ? 'video' : null;

    if (!type) {
      alert('Please select an image or video file');
      return;
    }

    // Check file size (5MB limit for Vercel)
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
      alert(`File too large (${sizeMB}MB). Please choose a file under 5MB.`);
      return;
    }

    setFile(selectedFile);
    setMediaType(type);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSend = async () => {
    if (!file) return;

    setSending(true);
    try {
      await onSend({
        file,
        caption,
        isLocked,
        unlockPrice: isLocked ? unlockPrice : 0,
      });
      onClose();
    } catch (error) {
      console.error('Error sending media:', error);
      alert(error instanceof Error ? error.message : 'Failed to send media');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/80 via-gray-900/90 to-black/80 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.3)] mx-auto">
        {/* Animated gradient border effect */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 animate-pulse" />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-cyan-500/20">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">Send Media</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative p-6 space-y-6">
          {/* File Upload */}
          {!file ? (
            <div className="space-y-4">
              <label className="block">
                <div className="border-2 border-dashed border-cyan-500/30 rounded-2xl p-12 text-center cursor-pointer hover:border-cyan-500/60 hover:bg-cyan-500/5 transition-all">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-cyan-500/20">
                      <Image className="w-10 h-10 text-cyan-400" />
                    </div>
                    <div className="p-3 rounded-xl bg-purple-500/20">
                      <Video className="w-10 h-10 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-white font-medium mb-2">Click to upload media</p>
                  <p className="text-sm text-gray-400">
                    Photos and videos up to 5MB
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <>
              {/* Preview */}
              <div className="relative">
                <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10">
                  {mediaType === 'image' ? (
                    <img
                      src={preview || ''}
                      alt="Preview"
                      className="w-full max-h-96 object-contain"
                    />
                  ) : (
                    <video
                      src={preview || ''}
                      controls
                      className="w-full max-h-96"
                    />
                  )}
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setMediaType(null);
                  }}
                  className="absolute top-4 right-4 p-2 bg-red-500/80 backdrop-blur-sm text-white rounded-lg hover:bg-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a title..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{caption.length}/500</p>
              </div>

              {/* PPV Toggle */}
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <h4 className="font-semibold text-white mb-4">Content Access</h4>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setIsLocked(false)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      !isLocked
                        ? 'border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Eye className={`w-6 h-6 mx-auto mb-2 ${!isLocked ? 'text-green-400' : 'text-gray-400'}`} />
                    <div className={`text-sm font-semibold ${!isLocked ? 'text-green-400' : 'text-white'}`}>Free</div>
                    <div className="text-xs text-gray-400">Send immediately</div>
                  </button>

                  <button
                    onClick={() => setIsLocked(true)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isLocked
                        ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Lock className={`w-6 h-6 mx-auto mb-2 ${isLocked ? 'text-purple-400' : 'text-gray-400'}`} />
                    <div className={`text-sm font-semibold ${isLocked ? 'text-purple-400' : 'text-white'}`}>Locked (PPV)</div>
                    <div className="text-xs text-gray-400">Charge to unlock</div>
                  </button>
                </div>

                {/* Price Input */}
                {isLocked && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Unlock Price
                    </label>
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
                  </div>
                )}
              </div>

              {/* Send Button */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {sending ? 'Sending...' : isLocked ? `Send Locked (${unlockPrice} coins)` : 'Send Free'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
