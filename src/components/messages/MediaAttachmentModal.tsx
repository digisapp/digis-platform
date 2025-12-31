'use client';

import { useState, useEffect } from 'react';
import { X, Image, Video, Lock, Eye, Coins, Upload, FolderOpen } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ContentItem {
  id: string;
  title: string;
  contentType: 'photo' | 'video' | 'gallery';
  thumbnailUrl: string;
  mediaUrl: string;
  unlockPrice: number;
  isFree: boolean;
}

interface MediaAttachmentModalProps {
  onClose: () => void;
  onSend: (data: {
    file?: File;
    contentId?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    caption: string;
    isLocked: boolean;
    unlockPrice: number;
  }) => Promise<void>;
  isCreator?: boolean; // If false, fan sending to creator - media will be blurred
  recipientIsCreator?: boolean; // If true, blur media for creator's safety
}

export function MediaAttachmentModal({ onClose, onSend, isCreator = false, recipientIsCreator = false }: MediaAttachmentModalProps) {
  const { showError } = useToastContext();
  const [activeTab, setActiveTab] = useState<'upload'>('upload'); // Fans only see upload

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);

  // Library state
  const [libraryContent, setLibraryContent] = useState<ContentItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

  // Common state
  const [caption, setCaption] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPrice, setUnlockPrice] = useState(25);
  const [sending, setSending] = useState(false);

  // Fetch library content when tab changes
  useEffect(() => {
    if (activeTab === 'library' && libraryContent.length === 0) {
      fetchLibraryContent();
    }
  }, [activeTab]);

  const fetchLibraryContent = async () => {
    setLoadingLibrary(true);
    try {
      const response = await fetch('/api/content/creator?limit=50');
      const data = await response.json();
      if (response.ok && data.content) {
        setLibraryContent(data.content);
      }
    } catch (error) {
      console.error('Error fetching library:', error);
      showError('Failed to load content library');
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file type
    const type = selectedFile.type.startsWith('image/') ? 'image' :
                 selectedFile.type.startsWith('video/') ? 'video' : null;

    if (!type) {
      showError('Please select an image or video file');
      return;
    }

    // Check file size (5MB limit for Vercel)
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
      showError(`File too large (${sizeMB}MB). Please choose a file under 5MB.`);
      return;
    }

    setFile(selectedFile);
    setMediaType(type);
    setSelectedContent(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSelectContent = (content: ContentItem) => {
    setSelectedContent(content);
    setFile(null);
    setPreview(null);
    setMediaType(null);
    setCaption(content.title || '');
    // Default to same pricing as the content
    if (!content.isFree && content.unlockPrice > 0) {
      setIsLocked(true);
      setUnlockPrice(content.unlockPrice);
    }
  };

  const handleSend = async () => {
    if (!file && !selectedContent) return;

    setSending(true);
    try {
      // For fans sending to creators: auto-blur (locked but free to reveal)
      const shouldAutoBlur = !isCreator && recipientIsCreator;
      const finalIsLocked = shouldAutoBlur ? true : isLocked;
      const finalUnlockPrice = shouldAutoBlur ? 0 : (isLocked ? unlockPrice : 0);

      if (selectedContent) {
        // Sending from library (creators only)
        await onSend({
          contentId: selectedContent.id,
          mediaUrl: selectedContent.mediaUrl,
          mediaType: selectedContent.contentType === 'video' ? 'video' : 'image',
          caption,
          isLocked: finalIsLocked,
          unlockPrice: finalUnlockPrice,
        });
      } else if (file) {
        // Sending new upload
        await onSend({
          file,
          caption,
          isLocked: finalIsLocked,
          unlockPrice: finalUnlockPrice,
        });
      }
      onClose();
    } catch (error) {
      console.error('Error sending media:', error);
      showError(error instanceof Error ? error.message : 'Failed to send media');
    } finally {
      setSending(false);
    }
  };

  const hasSelection = file || selectedContent;
  const currentPreview = file ? preview : selectedContent?.thumbnailUrl;
  const currentMediaType = file ? mediaType : (selectedContent?.contentType === 'video' ? 'video' : 'image');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/80 via-gray-900/90 to-black/80 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.3)] mx-auto">
        {/* Header */}
        <div className="relative flex items-center justify-between p-4 border-b border-cyan-500/20">
          <h3 className="text-xl font-bold text-white">Send Media</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - only show for creators */}
        {isCreator ? (
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload New
            </button>
            <button
              onClick={() => setActiveTab('library' as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'library'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              My Content
            </button>
          </div>
        ) : (
          <div className="border-b border-white/10 py-2 px-4">
            <p className="text-xs text-gray-400 text-center">
              📷 Your media will be blurred until the creator chooses to view it
            </p>
          </div>
        )}

        <div className="relative p-4 space-y-4">
          {/* Upload Tab */}
          {activeTab === 'upload' && !file && (
            <label className="block">
              <div className="border-2 border-dashed border-cyan-500/30 rounded-2xl p-8 text-center cursor-pointer hover:border-cyan-500/60 hover:bg-cyan-500/5 transition-all">
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="p-3 rounded-xl bg-cyan-500/20">
                    <Image className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/20">
                    <Video className="w-8 h-8 text-purple-400" />
                  </div>
                </div>
                <p className="text-white font-medium mb-1">Click to upload media</p>
                <p className="text-sm text-gray-400">Photos and videos up to 5MB</p>
              </div>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          )}

          {/* Library Tab */}
          {activeTab === 'library' && !selectedContent && (
            <div>
              {loadingLibrary ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : libraryContent.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No content in your library</p>
                  <p className="text-sm text-gray-500">Upload content from the Post page first</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {libraryContent.map((content) => (
                    <button
                      key={content.id}
                      onClick={() => handleSelectContent(content)}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-cyan-500 transition-colors group"
                    >
                      <img
                        src={content.thumbnailUrl}
                        alt={content.title}
                        className="w-full h-full object-cover"
                      />
                      {content.contentType === 'video' && (
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                          VIDEO
                        </div>
                      )}
                      {!content.isFree && (
                        <div className="absolute top-1 right-1 bg-yellow-500/80 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Coins className="w-2.5 h-2.5" />
                          {content.unlockPrice}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview (for both upload and library selection) */}
          {hasSelection && (
            <>
              <div className="relative">
                <div className="relative rounded-xl overflow-hidden bg-black border border-white/10">
                  {currentMediaType === 'video' ? (
                    <video
                      src={file ? preview || '' : selectedContent?.mediaUrl}
                      controls
                      className="w-full max-h-64"
                    />
                  ) : (
                    <img
                      src={currentPreview || ''}
                      alt="Preview"
                      className="w-full max-h-64 object-contain"
                    />
                  )}
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setMediaType(null);
                    setSelectedContent(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/80 backdrop-blur-sm text-white rounded-lg hover:bg-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                {selectedContent && (
                  <div className="absolute bottom-2 left-2 bg-black/70 text-xs text-cyan-400 px-2 py-1 rounded">
                    From Library
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-all resize-none text-sm"
                />
              </div>

              {/* PPV Toggle - only for creators */}
              {isCreator && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={() => setIsLocked(false)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        !isLocked
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <Eye className={`w-5 h-5 mx-auto mb-1 ${!isLocked ? 'text-green-400' : 'text-gray-400'}`} />
                      <div className={`text-sm font-medium ${!isLocked ? 'text-green-400' : 'text-white'}`}>Free</div>
                    </button>

                    <button
                      onClick={() => setIsLocked(true)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isLocked
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <Lock className={`w-5 h-5 mx-auto mb-1 ${isLocked ? 'text-purple-400' : 'text-gray-400'}`} />
                      <div className={`text-sm font-medium ${isLocked ? 'text-purple-400' : 'text-white'}`}>PPV</div>
                    </button>
                  </div>

                  {/* Price Input */}
                  {isLocked && (
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-cyan-400" />
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={unlockPrice}
                        onChange={(e) => setUnlockPrice(parseInt(e.target.value) || 1)}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-medium focus:outline-none focus:border-cyan-500/50 transition-all text-sm"
                      />
                      <span className="text-gray-400 text-sm">coins</span>
                    </div>
                  )}
                </div>
              )}

              {/* Send Button */}
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-medium hover:scale-105 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
                >
                  {sending ? 'Sending...' : (
                    isCreator
                      ? (isLocked ? `Send (${unlockPrice} coins)` : 'Send Free')
                      : 'Send (Blurred)'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
