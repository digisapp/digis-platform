'use client';

import { Video, X } from 'lucide-react';

interface StreamingTipsModalProps {
  onClose: () => void;
}

export function StreamingTipsModal({ onClose }: StreamingTipsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-b from-neutral-900 to-black border border-white/10 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border-b border-white/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Pro Streaming Tips</h2>
              <p className="text-xs text-gray-400">Level up your streams</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/5 border border-green-500/20 rounded-xl p-4">
            <h3 className="font-bold text-white mb-3">Best Video Quality</h3>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span><strong className="text-white">Use WiFi</strong> - Cellular data causes blurry streams</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span><strong className="text-white">Rear camera</strong> - Much higher quality than front camera</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span><strong className="text-white">Good lighting</strong> - Face a window or use a ring light</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span><strong className="text-white">Stable phone</strong> - Use a tripod or phone stand</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span><strong className="text-white">Desktop or Laptop streaming</strong> - Best Quality with an external WebCam or DSLR Camera</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-neutral-900/95 border-t border-white/10 p-4">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold rounded-xl transition-all"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
