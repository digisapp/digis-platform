'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToastContext } from '@/context/ToastContext';
import { ArrowLeft, Users, DollarSign, Send, Image, Video, Lock, Eye, TrendingUp } from 'lucide-react';

interface SubscriberStats {
  totalSubscribers: number;
  activeSubscribers: number;
  totalFollowers: number;
}

export default function BroadcastMessagePage() {
  const router = useRouter();
  const { showSuccess, showError } = useToastContext();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState<SubscriberStats>({
    totalSubscribers: 0,
    activeSubscribers: 0,
    totalFollowers: 0,
  });

  const [formData, setFormData] = useState({
    messageType: 'text' as 'text' | 'media',
    textMessage: '',
    file: null as File | null,
    caption: '',
    isLocked: false,
    unlockPrice: 20,
    targetAudience: 'all' as 'subscribers' | 'followers' | 'all',
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/creator/broadcast/stats');
      const data = await response.json();

      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const type = selectedFile.type.startsWith('image/') ? 'image' :
                 selectedFile.type.startsWith('video/') ? 'video' : null;

    if (!type) {
      showError('Please select an image or video file');
      return;
    }

    const maxSize = type === 'image' ? 50 * 1024 * 1024 : 500 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      showError(`File is too large. Max size: ${type === 'image' ? '50MB' : '500MB'}`);
      return;
    }

    setFormData({ ...formData, file: selectedFile, messageType: 'media' });
    setMediaType(type);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.messageType === 'text' && !formData.textMessage.trim()) {
      showError('Please enter a message');
      return;
    }

    if (formData.messageType === 'media' && !formData.file) {
      showError('Please select a file');
      return;
    }

    const recipientCount = getRecipientCount();
    const potentialRevenue = formData.isLocked ? recipientCount * formData.unlockPrice : 0;

    const confirmMessage = formData.isLocked
      ? `Send locked ${formData.messageType} to ${recipientCount} ${formData.targetAudience}?\n\nPotential revenue: ${potentialRevenue.toLocaleString()} coins`
      : `Send free ${formData.messageType} to ${recipientCount} ${formData.targetAudience}?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setSending(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('messageType', formData.messageType);
      uploadFormData.append('targetAudience', formData.targetAudience);

      if (formData.messageType === 'text') {
        uploadFormData.append('message', formData.textMessage);
      } else if (formData.file) {
        uploadFormData.append('file', formData.file);
        uploadFormData.append('caption', formData.caption);
        uploadFormData.append('isLocked', formData.isLocked.toString());
        uploadFormData.append('unlockPrice', formData.unlockPrice.toString());
      }

      const response = await fetch('/api/creator/broadcast/send', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(`Message sent to ${data.recipientCount} ${formData.targetAudience}!${potentialRevenue > 0 ? ` Potential revenue: ${potentialRevenue.toLocaleString()} coins` : ''}`);
        router.push('/creator/dashboard');
      } else {
        throw new Error(data.error || 'Failed to send broadcast');
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
      showError(error instanceof Error ? error.message : 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  const getRecipientCount = () => {
    switch (formData.targetAudience) {
      case 'subscribers':
        return stats.activeSubscribers;
      case 'followers':
        return stats.totalFollowers;
      case 'all':
        return stats.activeSubscribers + stats.totalFollowers;
      default:
        return 0;
    }
  };

  const getPotentialRevenue = () => {
    if (!formData.isLocked) return 0;
    return getRecipientCount() * formData.unlockPrice;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-digis-cyan mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-24 md:pb-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Message Type */}
          <div className="glass rounded-xl p-6 border-2 border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Message Type</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, messageType: 'text', file: null })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.messageType === 'text'
                    ? 'border-digis-cyan bg-digis-cyan/10'
                    : 'border-white/20 bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="text-2xl mb-2">💬</div>
                <div className="text-sm font-semibold text-white">Text Message</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, messageType: 'media' })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.messageType === 'media'
                    ? 'border-digis-cyan bg-digis-cyan/10'
                    : 'border-white/20 bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Image className="w-5 h-5 text-gray-300" />
                  <Video className="w-5 h-5 text-gray-300" />
                </div>
                <div className="text-sm font-semibold text-white">Photo/Video</div>
              </button>
            </div>
          </div>

          {/* Text Message Input */}
          {formData.messageType === 'text' && (
            <div className="glass rounded-xl p-6 border-2 border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Your Message</h3>
              <textarea
                value={formData.textMessage}
                onChange={(e) => setFormData({ ...formData, textMessage: e.target.value })}
                placeholder="Write your message to fans..."
                rows={6}
                maxLength={1000}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
              />
              <p className="text-xs text-gray-400 mt-2">{formData.textMessage.length}/1000</p>
            </div>
          )}

          {/* Media Upload */}
          {formData.messageType === 'media' && (
            <>
              <div className="glass rounded-xl p-6 border-2 border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Upload Media</h3>

                {preview ? (
                  <div className="relative">
                    <div className="relative rounded-xl overflow-hidden bg-black">
                      {mediaType === 'image' ? (
                        <img src={preview} alt="Preview" className="w-full max-h-96 object-contain" />
                      ) : (
                        <video src={preview} controls className="w-full max-h-96" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, file: null });
                        setPreview(null);
                        setMediaType(null);
                      }}
                      className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <span className="text-sm font-semibold">Remove</span>
                    </button>
                  </div>
                ) : (
                  <label className="block">
                    <div className="border-2 border-dashed border-white/30 rounded-xl p-12 text-center cursor-pointer hover:border-digis-cyan hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <Image className="w-12 h-12 text-digis-cyan" />
                        <Video className="w-12 h-12 text-digis-pink" />
                      </div>
                      <p className="text-white font-medium mb-2">Click to upload media</p>
                      <p className="text-sm text-gray-400">Photos up to 50MB, Videos up to 500MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Caption */}
                {formData.file && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Caption (optional)</label>
                    <textarea
                      value={formData.caption}
                      onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                      placeholder="Add a caption..."
                      rows={3}
                      maxLength={500}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">{formData.caption.length}/500</p>
                  </div>
                )}
              </div>

              {/* PPV Toggle */}
              {formData.file && (
                <div className="glass rounded-xl p-6 border-2 border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Content Access</h3>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isLocked: false })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        !formData.isLocked
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-white/20 bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <Eye className={`w-6 h-6 mx-auto mb-2 ${!formData.isLocked ? 'text-green-500' : 'text-gray-400'}`} />
                      <div className="text-sm font-semibold text-white">Free</div>
                      <div className="text-xs text-gray-400">Send immediately</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isLocked: true })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.isLocked
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/20 bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <Lock className={`w-6 h-6 mx-auto mb-2 ${formData.isLocked ? 'text-purple-500' : 'text-gray-400'}`} />
                      <div className="text-sm font-semibold text-white">Locked (PPV)</div>
                      <div className="text-xs text-gray-400">Charge to unlock</div>
                    </button>
                  </div>

                  {formData.isLocked && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Unlock Price</label>
                      <div className="flex items-center gap-4">
                        <DollarSign className="w-6 h-6 text-digis-cyan" />
                        <input
                          type="number"
                          min="1"
                          max="10000"
                          value={formData.unlockPrice}
                          onChange={(e) => setFormData({ ...formData, unlockPrice: parseInt(e.target.value) || 1 })}
                          className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-semibold focus:outline-none focus:border-digis-cyan transition-colors"
                        />
                        <span className="text-gray-300 font-medium">coins</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Revenue Preview */}
          {formData.isLocked && formData.messageType === 'media' && formData.file && (
            <div className="glass rounded-xl p-6 border-2 border-green-500 bg-green-500/10">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-6 h-6 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Potential Revenue</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Recipients</div>
                  <div className="text-2xl font-bold text-white">{getRecipientCount().toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Max Earnings (100% unlock)</div>
                  <div className="text-2xl font-bold text-green-400">{getPotentialRevenue().toLocaleString()} coins</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-400">
                  💡 Each recipient who unlocks pays {formData.unlockPrice} coins. Typical unlock rates range from 10-30%.
                </p>
              </div>
            </div>
          )}

          {/* Send Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-4 bg-white/10 border-2 border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || (formData.messageType === 'text' && !formData.textMessage.trim()) || (formData.messageType === 'media' && !formData.file)}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {sending ? 'Sending...' : `Send to ${getRecipientCount()} ${formData.targetAudience}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
