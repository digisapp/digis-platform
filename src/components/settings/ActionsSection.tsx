'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';
import { Crown, Trash2, AlertCircle, X } from 'lucide-react';

interface ActionsSectionProps {
  currentUser: any;
  signOut: () => Promise<void>;
}

export function ActionsSection({ currentUser, signOut }: ActionsSectionProps) {
  const router = useRouter();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    setDeleteError('');

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmUsername: currentUser?.username }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      await signOut();
      window.location.href = '/?deleted=true';
    } catch (err: any) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Become Creator Button - Only for Fans */}
        {currentUser?.role === 'fan' && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Crown className="w-5 h-5 text-digis-pink" />
              Creator Account
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              Upgrade to a creator account to start streaming, receive tips, and build your community.
            </p>
            <button
              type="button"
              onClick={() => router.push('/creator/apply')}
              className="w-full px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-xl font-semibold text-white hover:scale-[1.02] transition-transform"
            >
              Become a Creator
            </button>
          </div>
        )}

        {/* Delete Account */}
        <div className="pt-6 border-t border-red-500/20">
          <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Delete Account
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteConfirmText('');
              setDeleteError('');
            }}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 text-sm font-medium transition-all"
          >
            Delete My Account
          </button>
        </div>

        {/* Support */}
        <div className="pt-6 border-t border-cyan-500/20 text-center">
          <span className="text-gray-400">Contact Support: </span>
          <a
            href="mailto:support@digis.cc?subject=Digis Support Request"
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            support@digis.cc
          </a>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />

          <div className="relative bg-gradient-to-b from-neutral-900 to-black border border-red-500/30 rounded-2xl max-w-md w-full shadow-2xl" role="dialog" aria-modal="true" aria-label="Delete account">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-red-500/20">
              <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Delete Account
              </h2>
              <button
                onClick={() => !deleting && setShowDeleteModal(false)}
                disabled={deleting}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-300 font-medium mb-2">This action is permanent and cannot be undone.</p>
                <p className="text-xs text-gray-400">
                  All your data will be permanently deleted, including:
                </p>
                <ul className="text-xs text-gray-400 mt-2 space-y-1 list-disc list-inside">
                  <li>Profile information and settings</li>
                  <li>Messages and conversations</li>
                  <li>Content, streams, and VODs</li>
                  <li>Wallet balance and transaction history</li>
                  <li>Subscriptions and followers</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Type <span className="font-mono text-red-400">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE"
                  disabled={deleting}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 disabled:opacity-50 font-mono"
                />
              </div>

              {deleteError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{deleteError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-500/30 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
