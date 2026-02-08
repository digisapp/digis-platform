'use client';

import { VoiceMessageButton } from '@/components/messages/VoiceMessageButton';
import { Gift, Plus, Camera, Mic, FolderOpen, X, Send, Coins } from 'lucide-react';

interface ChatInputProps {
  newMessage: string;
  sending: boolean;
  showVoiceRecorder: boolean;
  showAttachmentMenu: boolean;
  recipientIsCreator: boolean;
  costPerMessage: number | null;
  currentUserIsAdmin: boolean;
  currentUserRole: string | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputBlur: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleAttachmentMenu: () => void;
  onShowMediaModal: () => void;
  onShowVoiceRecorder: () => void;
  onCancelVoiceRecorder: () => void;
  onShowTipModal: () => void;
  onSendVoice: (blob: Blob, duration: number, price?: number) => Promise<void>;
}

export function ChatInput({
  newMessage, sending, showVoiceRecorder, showAttachmentMenu,
  recipientIsCreator, costPerMessage, currentUserIsAdmin, currentUserRole,
  onInputChange, onInputBlur, onSubmit, onToggleAttachmentMenu,
  onShowMediaModal, onShowVoiceRecorder, onCancelVoiceRecorder,
  onShowTipModal, onSendVoice,
}: ChatInputProps) {
  return (
    <div className="backdrop-blur-xl bg-black/60 border-t border-white/10 sticky bottom-0 pb-mobile-safe lg:pb-4 rounded-b-3xl">
      <div className="px-4 py-4">
        {showVoiceRecorder ? (
          <VoiceMessageButton
            onSend={async (blob, duration, price) => {
              await onSendVoice(blob, duration, price);
            }}
            isCreator={currentUserRole === 'creator'}
            autoStart={true}
            onCancel={onCancelVoiceRecorder}
          />
        ) : (
          <form onSubmit={onSubmit} className="relative flex gap-2 items-center pt-6">
            {/* Attachment Menu Button */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={onToggleAttachmentMenu}
                className={`p-2.5 border rounded-full transition-all flex items-center justify-center ${
                  showAttachmentMenu
                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300'
                    : 'bg-white/10 border-white/30 hover:bg-white/20 hover:border-cyan-400 text-white'
                }`}
                title="Attach"
              >
                {showAttachmentMenu ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>

              {showAttachmentMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={onToggleAttachmentMenu} />
                  <div className="absolute bottom-14 left-0 bg-black/95 backdrop-blur-xl rounded-2xl border border-white/20 p-2 min-w-[180px] z-50 shadow-xl shadow-black/50">
                    <button
                      onClick={() => { onToggleAttachmentMenu(); onShowMediaModal(); }}
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-cyan-500/20"><Camera className="w-5 h-5 text-cyan-400" /></div>
                      <span className="font-medium">Photo / Video</span>
                    </button>

                    <button
                      onClick={() => { onToggleAttachmentMenu(); onShowVoiceRecorder(); }}
                      className="w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-purple-500/20"><Mic className="w-5 h-5 text-purple-400" /></div>
                      <span className="font-medium">Voice Message</span>
                    </button>

                    {recipientIsCreator && (
                      <button
                        onClick={() => { onToggleAttachmentMenu(); onShowTipModal(); }}
                        className="w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-yellow-500/20"><Gift className="w-5 h-5 text-yellow-400" /></div>
                        <span className="font-medium">Send Gift</span>
                      </button>
                    )}

                    {currentUserRole === 'creator' && (
                      <button
                        onClick={() => { onToggleAttachmentMenu(); onShowMediaModal(); }}
                        className="w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-green-500/20"><FolderOpen className="w-5 h-5 text-green-400" /></div>
                        <span className="font-medium">From My Content</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Cost indicator */}
            {recipientIsCreator && (costPerMessage || 0) > 0 && (
              <div className="absolute -top-8 left-0 right-0 flex justify-center">
                <div className={`px-3 py-1 ${currentUserIsAdmin ? 'bg-green-500/20 border-green-500/40' : 'bg-yellow-500/20 border-yellow-500/40'} border rounded-full flex items-center gap-1.5`}>
                  <Coins className={`w-3.5 h-3.5 ${currentUserIsAdmin ? 'text-green-400' : 'text-yellow-400'}`} />
                  <span className={`text-xs font-medium ${currentUserIsAdmin ? 'text-green-300' : 'text-yellow-300'}`}>
                    {costPerMessage} coins per message{currentUserIsAdmin && ' (free for admin)'}
                  </span>
                </div>
              </div>
            )}

            <input
              type="text"
              value={newMessage}
              onChange={onInputChange}
              onBlur={onInputBlur}
              placeholder="Message..."
              className="flex-1 min-w-0 bg-white/10 border border-white/30 rounded-full px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white/15 transition-all text-base"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full text-sm font-bold hover:scale-105 transition-transform disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 shadow-lg shadow-cyan-500/20"
            >
              {sending ? '...' : (<><Send className="w-4 h-4" /><span>Send</span></>)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
