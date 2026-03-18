'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Trash2, Mic, ArrowDown } from 'lucide-react';
import { SuccessCoachMessage } from './SuccessCoachMessage';
import { QuickActionButtons } from './QuickActionButtons';
import { ScriptGeneratorFlow } from './ScriptGeneratorFlow';
import { useCoachChat } from './useCoachChat';
import { useSpeechRecognition } from './useSpeechRecognition';

interface SuccessCoachPanelProps {
  creatorId: string;
  onClose: () => void;
}

export function SuccessCoachPanel({ creatorId, onClose }: SuccessCoachPanelProps) {
  const [input, setInput] = useState('');
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    error,
    suggestions,
    sendMessage,
    clearHistory,
    scriptState,
    isGeneratingScript,
    startScriptGenerator,
    updateScriptState,
    generateScript,
    closeScriptGenerator
  } = useCoachChat(creatorId);

  // Voice input
  const handleVoiceResult = useCallback((transcript: string) => {
    if (transcript.trim() && !isLoading) sendMessage(transcript);
  }, [sendMessage, isLoading]);

  const {
    isListening,
    isSupported: isVoiceSupported,
    transcript: voiceTranscript,
    startListening,
    stopListening,
    error: voiceError
  } = useSpeechRecognition({ onResult: handleVoiceResult });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Track scroll position for "scroll down" button
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setShowScrollDown(!isNearBottom && messages.length > 3);
  };

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleQuickAction = (prompt: string) => sendMessage(prompt);

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion === 'Generate a promo script') {
      startScriptGenerator();
    } else {
      sendMessage(suggestion);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full h-full md:w-96 md:h-[540px] md:max-h-[75vh] md:rounded-2xl bg-black/95 backdrop-blur-2xl saturate-150 md:border md:border-white/15 md:shadow-[0_25px_60px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden animate-slideUp">
      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-3.5 border-b border-white/10">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/15 via-purple-500/10 to-cyan-500/15" />

        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.4)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Creator Coach</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
              <p className="text-[11px] text-gray-400">AI-powered</p>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-colors"
              title="Clear history"
              aria-label="Clear history"
            >
              <Trash2 className="w-4 h-4 text-gray-500 hover:text-gray-300" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Script Generator Flow */}
      {scriptState && (
        <ScriptGeneratorFlow
          state={scriptState}
          onUpdate={updateScriptState}
          onGenerate={generateScript}
          onClose={closeScriptGenerator}
          isGenerating={isGeneratingScript}
        />
      )}

      {/* Main content */}
      {!scriptState && (
        <>
          {/* Quick actions */}
          <QuickActionButtons
            onAction={handleQuickAction}
            onStartScriptGenerator={startScriptGenerator}
            disabled={isLoading}
          />

          {/* Messages area */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="relative flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/20 flex items-center justify-center mb-5">
                  <Sparkles className="w-10 h-10 text-purple-400" />
                </div>
                <h4 className="font-semibold text-white text-lg mb-2">Hey! I'm your Coach</h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  I can help with platform features, content ideas, pricing, and promo scripts for your niche.
                </p>
                <p className="text-xs text-gray-600 mt-4">
                  Try a quick action above or ask me anything
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <SuccessCoachMessage key={message.id} message={message} />
                ))}
                {isLoading && (
                  <div className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 rounded-tl-sm">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}

            {/* Scroll to bottom FAB */}
            {showScrollDown && (
              <button
                onClick={scrollToBottom}
                className="sticky bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg transition-all hover:bg-white/20"
              >
                <ArrowDown className="w-4 h-4 text-white" />
              </button>
            )}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && !isLoading && (
            <div className="px-4 py-2.5 border-t border-white/5">
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 rounded-full text-xs bg-white/5 hover:bg-purple-500/15 text-gray-400 hover:text-purple-300 border border-white/10 hover:border-purple-500/30 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {(error || voiceError) && (
            <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error || voiceError}
            </div>
          )}

          {/* Listening indicator */}
          {isListening && (
            <div className="mx-4 mb-2 px-3 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-3 rounded-full bg-purple-400 animate-pulse" />
                <div className="w-1.5 h-4 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-2.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
              <span>{voiceTranscript || 'Listening...'}</span>
            </div>
          )}

          {/* Input area */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-black/30">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
                disabled={isLoading || isListening}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] disabled:opacity-50 transition-all"
              />
              {isVoiceSupported && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  className={`p-3 rounded-2xl transition-all ${
                    isListening
                      ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                  } disabled:opacity-50`}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                  aria-label={isListening ? 'Stop listening' : 'Voice input'}
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isListening}
                className="p-3 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl text-white shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] transition-all disabled:opacity-30 disabled:shadow-none"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </div>
  );
}
