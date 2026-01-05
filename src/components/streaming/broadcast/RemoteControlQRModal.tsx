'use client';

import { Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface RemoteControlQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
}

/**
 * Modal displaying a QR code for remote stream control from a mobile device.
 * Allows creators to control their stream (chat, goals, polls, etc.) from their phone
 * while streaming from a computer.
 */
export function RemoteControlQRModal({ isOpen, onClose, streamId }: RemoteControlQRModalProps) {
  if (!isOpen) return null;

  const controlUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/stream/control/${streamId}`
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl p-6 max-w-sm mx-4 border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Smartphone className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Remote Control</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Scan with your phone to control your stream remotely
          </p>
          <div className="bg-white p-4 rounded-xl inline-block mb-4">
            <QRCodeSVG
              value={controlUrl}
              size={180}
              level="M"
            />
          </div>
          <p className="text-gray-500 text-xs mb-4">
            Chat, goals, polls, VIP shows & moderation from your phone
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
