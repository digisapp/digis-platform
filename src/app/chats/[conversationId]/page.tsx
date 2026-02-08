'use client';

import { useParams, useRouter } from 'next/navigation';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { TipModal } from '@/components/messages/TipModal';
import { MediaAttachmentModal } from '@/components/messages/MediaAttachmentModal';
import { MessageChargeWarningModal } from '@/components/messages/MessageChargeWarningModal';
import { InsufficientBalanceModal } from '@/components/messages/InsufficientBalanceModal';
import { TypingIndicator } from '@/components/messages/TypingIndicator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useChatData } from '@/hooks/useChatData';
import { useChatActions } from '@/hooks/useChatActions';
import { ChatHeader, ChatInput } from '@/components/chat';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const data = useChatData({ conversationId });
  const actions = useChatActions({
    conversationId,
    conversation: data.conversation,
    currentUserId: data.currentUserId,
    currentUserRole: data.currentUserRole,
    currentUserIsAdmin: data.currentUserIsAdmin,
    recipientIsCreator: data.recipientIsCreator,
    costPerMessage: data.costPerMessage,
    hasAcknowledgedCharge: data.hasAcknowledgedCharge,
    setHasAcknowledgedCharge: data.setHasAcknowledgedCharge,
    userBalance: data.userBalance,
    setMessages: data.setMessages,
    setPendingMessages: data.setPendingMessages,
    fetchMessages: data.fetchMessages,
    fetchUserBalance: data.fetchUserBalance,
    scrollToBottom: data.scrollToBottom,
    sendTypingIndicator: data.sendTypingIndicator,
  });

  if (data.loading) {
    return (
      <div className="flex-1 flex items-center justify-center backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl border-2 border-cyan-500/30 lg:shadow-[0_0_50px_rgba(34,211,238,0.3)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data.conversation) {
    return (
      <div className="flex-1 flex items-center justify-center backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl border-2 border-cyan-500/30 lg:shadow-[0_0_50px_rgba(34,211,238,0.3)]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Conversation not found</h2>
          <button
            onClick={() => router.push('/chats')}
            className="px-6 py-3 bg-digis-cyan text-gray-900 rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            Back to Chats
          </button>
        </div>
      </div>
    );
  }

  const conversation = data.conversation;

  return (
    <>
      <div className="flex-1 flex flex-col backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl border-2 border-cyan-500/30 lg:shadow-[0_0_50px_rgba(34,211,238,0.3)] overflow-hidden">
        {/* Header */}
        <ChatHeader
          conversation={conversation}
          showOptionsMenu={actions.showOptionsMenu}
          setShowOptionsMenu={actions.setShowOptionsMenu}
          isBlocking={actions.isBlocking}
          onBlockUser={actions.handleBlockUser}
        />

        {/* Messages */}
        <div
          ref={data.messagesContainerRef}
          onScroll={data.handleScroll}
          onTouchMove={data.handleScroll}
          className="flex-1 overflow-y-auto overscroll-contain relative"
        >
          <div className="px-4 py-6">
            <div className="space-y-4">
              {/* Load older messages */}
              {data.messages.length > 0 && data.hasMoreMessages && (
                <div className="text-center py-2">
                  <button
                    onClick={data.loadMoreMessages}
                    disabled={data.loadingMore}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                  >
                    {data.loadingMore ? 'Loading...' : 'Load older messages'}
                  </button>
                </div>
              )}

              {data.messages.length === 0 && data.pendingMessages.size === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👋</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Start the conversation!</h3>
                  <p className="text-gray-400">Send a message to get started</p>
                </div>
              ) : (
                <>
                  {data.messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwnMessage={message.sender.id === data.currentUserId}
                      currentUserId={data.currentUserId || ''}
                      onUnlock={actions.handleUnlockMessage}
                      onDelete={actions.handleDeleteMessage}
                      onEdit={actions.handleEditMessage}
                    />
                  ))}

                  {/* Optimistic pending messages */}
                  {Array.from(data.pendingMessages).map(([tempId, pending]) => (
                    <div key={tempId} className="flex justify-end">
                      <div className="max-w-[70%]">
                        <div className="px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500/70 to-purple-500/70 text-white">
                          <p className="break-words">{pending.content}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 flex items-center justify-end gap-1">
                          <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                          Sending...
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {data.isOtherUserTyping && conversation && (
                <TypingIndicator userName={conversation.otherUser.username || undefined} />
              )}
              <div ref={data.messagesEndRef} />
            </div>
          </div>

          {/* New messages badge */}
          {data.newMessageCount > 0 && (
            <button
              onClick={() => { data.setNewMessageCount(0); data.scrollToBottom(true); }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-cyan-500 text-white rounded-full text-sm font-medium shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 transition-all animate-bounce flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              {data.newMessageCount} new message{data.newMessageCount > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Input */}
        <ChatInput
          newMessage={actions.newMessage}
          sending={actions.sending}
          showVoiceRecorder={actions.showVoiceRecorder}
          showAttachmentMenu={actions.showAttachmentMenu}
          recipientIsCreator={data.recipientIsCreator}
          costPerMessage={data.costPerMessage}
          currentUserIsAdmin={data.currentUserIsAdmin}
          currentUserRole={data.currentUserRole}
          onInputChange={actions.handleInputChange}
          onInputBlur={() => data.sendTypingIndicator(false)}
          onSubmit={actions.sendMessage}
          onToggleAttachmentMenu={() => actions.setShowAttachmentMenu(!actions.showAttachmentMenu)}
          onShowMediaModal={() => actions.setShowMediaModal(true)}
          onShowVoiceRecorder={() => actions.setShowVoiceRecorder(true)}
          onCancelVoiceRecorder={() => actions.setShowVoiceRecorder(false)}
          onShowTipModal={() => actions.setShowTipModal(true)}
          onSendVoice={actions.handleSendVoice}
        />
      </div>

      {/* Modals */}
      {actions.showTipModal && conversation && (
        <TipModal
          onClose={() => actions.setShowTipModal(false)}
          onSend={actions.handleSendTip}
          receiverName={conversation.otherUser.username || 'User'}
        />
      )}

      {actions.showMediaModal && (
        <MediaAttachmentModal
          onClose={() => actions.setShowMediaModal(false)}
          onSend={actions.handleSendMedia}
          isCreator={data.currentUserRole === 'creator'}
          recipientIsCreator={data.recipientIsCreator}
        />
      )}

      {actions.showChargeWarning && conversation && (
        <MessageChargeWarningModal
          recipientName={conversation.otherUser.username || 'Creator'}
          messageCharge={data.costPerMessage || 0}
          messagePreview={actions.pendingMessage}
          onClose={actions.handleChargeClose}
          onConfirm={actions.handleChargeConfirm}
        />
      )}

      {actions.insufficientBalanceInfo && (
        <InsufficientBalanceModal
          required={actions.insufficientBalanceInfo.required}
          balance={actions.insufficientBalanceInfo.balance}
          type={actions.insufficientBalanceInfo.type}
          onClose={() => actions.setInsufficientBalanceInfo(null)}
        />
      )}
    </>
  );
}
