'use client';

import { useState } from 'react';
import { X, Image, Video, Lock, Eye, DollarSign } from 'lucide-react';

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
  const [unlockPrice, setUnlockPrice] = useState(20);
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

    // Check file size (50MB for images, 500MB for videos)
    const maxSize = type === 'image' ? 50 * 1024 * 1024 : 500 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      alert(`File is too large. Max size: ${type === 'image' ? '50MB' : '500MB'}`);
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-pastel-gradient rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-purple-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-200">
          <h3 className="text-2xl font-bold text-gray-800">Send Media</h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* File Upload */}
          {!file ? (
            <div className="space-y-4">
              <label className="block">
                <div className="border-2 border-dashed border-purple-300 rounded-xl p-12 text-center cursor-pointer hover:border-digis-cyan hover:bg-white/40 transition-all">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Image className="w-12 h-12 text-purple-500" />
                    <Video className="w-12 h-12 text-pink-500" />
                  </div>
                  <p className="text-gray-700 font-medium mb-2">Click to upload media</p>
                  <p className="text-sm text-gray-600">
                    Photos up to 50MB, Videos up to 500MB
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
                <div className="relative rounded-xl overflow-hidden bg-black">
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
                  className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caption (optional)
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
                />
                <p className="text-xs text-gray-600 mt-1">{caption.length}/500</p>
              </div>

              {/* PPV Toggle */}
              <div className="glass rounded-xl p-4 border-2 border-purple-200">
                <h4 className="font-semibold text-gray-800 mb-3">Content Access</h4>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setIsLocked(false)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      !isLocked
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-purple-200 bg-white/60 hover:bg-white/80'
                    }`}
                  >
                    <Eye className={`w-6 h-6 mx-auto mb-2 ${!isLocked ? 'text-green-500' : 'text-gray-600'}`} />
                    <div className="text-sm font-semibold text-gray-800">Free</div>
                    <div className="text-xs text-gray-600">Send immediately</div>
                  </button>

                  <button
                    onClick={() => setIsLocked(true)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isLocked
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-purple-200 bg-white/60 hover:bg-white/80'
                    }`}
                  >
                    <Lock className={`w-6 h-6 mx-auto mb-2 ${isLocked ? 'text-purple-500' : 'text-gray-600'}`} />
                    <div className="text-sm font-semibold text-gray-800">Locked (PPV)</div>
                    <div className="text-xs text-gray-600">Charge to unlock</div>
                  </button>
                </div>

                {/* Price Input */}
                {isLocked && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unlock Price
                    </label>
                    <div className="flex items-center gap-4">
                      <DollarSign className="w-6 h-6 text-purple-500" />
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={unlockPrice}
                        onChange={(e) => setUnlockPrice(parseInt(e.target.value) || 1)}
                        className="flex-1 px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 font-semibold focus:outline-none focus:border-digis-cyan transition-colors"
                      />
                      <span className="text-gray-600 font-medium">coins</span>
                    </div>
                    <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <p className="text-sm text-purple-700">
                        Recipient will pay {unlockPrice} coins to view this {mediaType}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              {isLocked && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div className="text-sm text-blue-700">
                      <p className="font-semibold mb-1">How PPV Messages Work</p>
                      <ul className="space-y-1">
                        <li>• Message appears blurred with unlock button</li>
                        <li>• Recipient pays to unlock and view</li>
                        <li>• You earn 100% of unlock revenue</li>
                        <li>• Once unlocked, they can view anytime</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Send Button */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white/60 border border-purple-200 text-gray-800 rounded-xl font-semibold hover:bg-white/80 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 rounded-xl font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
