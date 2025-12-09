'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { X, Gift, Video, MessageCircle, Radio } from 'lucide-react';

interface SignUpPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string; // What action triggered this (e.g., "send a tip", "start a call")
  creatorName?: string;
}

export function SignUpPromptModal({ isOpen, onClose, action, creatorName }: SignUpPromptModalProps) {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleSignUp = () => {
    router.push('/signup');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-md bg-black/95 rounded-3xl p-8 border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(34,211,238,0.3),inset_0_0_30px_rgba(34,211,238,0.1)] transition-transform duration-200 ${
          isClosing ? 'scale-95' : 'scale-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 blur-xl -z-10" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-cyan-500/20 rounded-full transition-colors border border-transparent hover:border-cyan-500/50"
        >
          <X className="w-5 h-5 text-cyan-400" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-white to-cyan-400 bg-clip-text text-transparent">
            Create Account to continue
          </h2>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-red-500/30 hover:border-red-500/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <Radio className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">Watch Creator's Stream</p>
              <p className="text-sm text-gray-400">Watch live and recorded streams</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-cyan-500/30 hover:border-cyan-500/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <Video className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-white font-medium">Video & Voice Calls</p>
              <p className="text-sm text-gray-400">Connect 1-on-1 with creators</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-pink-500/30 hover:border-pink-500/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.3)]">
              <Gift className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="text-white font-medium">Send Tips & Gifts</p>
              <p className="text-sm text-gray-400">Support your favorite creators</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-purple-500/30 hover:border-purple-500/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <MessageCircle className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-medium">Chats</p>
              <p className="text-sm text-gray-400">Chat privately with creators</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSignUp}
            className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 rounded-xl text-white font-bold text-lg transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(34,211,238,0.4)]"
          >
            Create Free Account
          </button>
          <button
            onClick={handleSignIn}
            className="w-full py-3 px-6 bg-transparent hover:bg-cyan-500/10 border-2 border-cyan-500/50 hover:border-cyan-500 rounded-xl text-cyan-400 font-semibold transition-all"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
