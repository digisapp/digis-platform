'use client';

import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import type { ConfirmModal } from './types';

interface CommunityModalsProps {
  confirmModal: ConfirmModal | null;
  onCloseConfirm: () => void;
  toast: { message: string; type: 'success' | 'error' } | null;
  onCloseToast: () => void;
}

export function CommunityModals({ confirmModal, onCloseConfirm, toast, onCloseToast }: CommunityModalsProps) {
  return (
    <>
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              {confirmModal.type === 'danger' && (
                <div className="p-2 rounded-xl bg-red-500/20">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
              )}
              {confirmModal.type === 'warning' && (
                <div className="p-2 rounded-xl bg-yellow-500/20">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                </div>
              )}
              {confirmModal.type === 'confirm' && (
                <div className="p-2 rounded-xl bg-cyan-500/20">
                  <CheckCircle className="w-6 h-6 text-cyan-400" />
                </div>
              )}
              <h3 className="text-lg font-semibold text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-gray-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onCloseConfirm}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  confirmModal.type === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : confirmModal.type === 'warning'
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                    : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
            <button onClick={onCloseToast} className="ml-2 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
