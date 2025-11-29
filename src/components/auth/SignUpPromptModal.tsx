'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, Gift, Video, MessageCircle, Heart } from 'lucide-react';

interface SignUpPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string; // What action triggered this (e.g., "send a tip", "start a call")
  creatorName?: string;
}

export function SignUpPromptModal({ isOpen, onClose, action, creatorName }: SignUpPromptModalProps) {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen) return null;

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

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 border border-white/10 shadow-2xl shadow-purple-500/20 transition-transform duration-200 ${
          isClosing ? 'scale-95' : 'scale-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4 shadow-lg shadow-purple-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Join Digis to Continue
          </h2>
          <p className="text-gray-400">
            {action && creatorName
              ? `Sign up to ${action} with ${creatorName}`
              : 'Create a free account to unlock all features'}
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-white font-medium">Video & Voice Calls</p>
              <p className="text-sm text-gray-400">Connect 1-on-1 with creators</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="text-white font-medium">Send Tips & Gifts</p>
              <p className="text-sm text-gray-400">Support your favorite creators</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-medium">Direct Messages</p>
              <p className="text-sm text-gray-400">Chat privately with creators</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">Follow Creators</p>
              <p className="text-sm text-gray-400">Never miss a live stream</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSignUp}
            className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-bold text-lg transition-all hover:scale-[1.02] shadow-lg shadow-purple-500/30"
          >
            Create Free Account
          </button>
          <button
            onClick={handleSignIn}
            className="w-full py-3 px-6 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-semibold transition-all"
          >
            Already have an account? Sign In
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
