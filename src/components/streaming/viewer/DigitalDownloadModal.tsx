'use client';

import React from 'react';
import { Download, CheckCircle } from 'lucide-react';

// Helper to validate URLs for security (prevent javascript: and other malicious protocols)
function isValidDownloadUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

interface DigitalDownloadModalProps {
  digitalDownload: {
    url: string;
    itemLabel: string;
    amount: number;
  };
  onClose: () => void;
}

export function DigitalDownloadModal({ digitalDownload, onClose }: DigitalDownloadModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-gray-900 to-black border border-green-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Purchase Complete!</h3>
          <p className="text-gray-400 mb-4">
            You purchased <span className="text-green-400 font-semibold">{digitalDownload.itemLabel}</span> for {digitalDownload.amount} coins
          </p>
          {isValidDownloadUrl(digitalDownload.url) ? (
            <a
              href={digitalDownload.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-semibold rounded-xl transition-all mb-3"
            >
              <Download className="w-5 h-5" />
              Download Now
            </a>
          ) : (
            <div className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-600 text-gray-300 font-semibold rounded-xl mb-3">
              <Download className="w-5 h-5" />
              Download unavailable
            </div>
          )}
          <p className="text-xs text-gray-500 mb-4">
            This link will also be saved in your purchase history
          </p>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
