'use client';

import { X, Send } from 'lucide-react';
import { GlassModal } from '@/components/ui';
import type { ComposeData } from '@/hooks/useAdminInbox';

interface ComposeModalProps {
  isOpen: boolean;
  compose: ComposeData;
  setCompose: React.Dispatch<React.SetStateAction<ComposeData>>;
  sending: boolean;
  onSend: () => void;
  onClose: () => void;
}

export function ComposeModal({ isOpen, compose, setCompose, sending, onSend, onClose }: ComposeModalProps) {
  const isValid = compose.to && compose.subject && compose.bodyText;

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title={compose.replyToEmailId ? 'Reply' : 'New Email'} size="lg">
      <div className="space-y-4">
        {/* To */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">To</label>
          <input
            type="email"
            value={compose.to}
            onChange={(e) => setCompose(prev => ({ ...prev, to: e.target.value }))}
            placeholder="recipient@email.com"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Subject</label>
          <input
            type="text"
            value={compose.subject}
            onChange={(e) => setCompose(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Email subject"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Message</label>
          <textarea
            value={compose.bodyText}
            onChange={(e) => setCompose(prev => ({ ...prev, bodyText: e.target.value }))}
            placeholder="Write your message..."
            rows={10}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-sm resize-none leading-relaxed"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={!isValid || sending}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </GlassModal>
  );
}
