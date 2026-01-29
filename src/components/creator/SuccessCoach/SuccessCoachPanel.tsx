'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Trash2, Mic } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Voice input handling
  const handleVoiceResult = useCallback((transcript: string) => {
    if (transcript.trim() && !isLoading) {
      sendMessage(transcript);
    }
  }, [sendMessage, isLoading]);

  const {
    isListening,
    isSupported: isVoiceSupported,
    transcript: voiceTranscript,
    startListening,
    stopListening,
    error: voiceError
  } = useSpeechRecognition({
    onResult: handleVoiceResult,
  });

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion === 'Generate a promo script') {
      startScriptGenerator();
    } else {
      sendMessage(suggestion);
    }
  };

  return (
    <div className="w-80 md:w-96 h-[500px] max-h-[70vh] backdrop-blur-xl bg-black/90 rounded-2xl border border-white/20 shadow-2xl flex flex-col overflow-hidden animate-slideUp">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Creator Coach</h3>
            <p className="text-[10px] text-gray-400">AI-powered success tips</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Clear history"
            >
              <Trash2 className="w-4 h-4 text-gray-500 hover:text-gray-300" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
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

      {/* Main content - hide when script generator is open */}
      {!scriptState && (
        <>
          {/* Quick actions */}
          <QuickActionButtons
            onAction={handleQuickAction}
            onStartScriptGenerator={startScriptGenerator}
            disabled={isLoading}
          />

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                </div>
                <h4 className="font-semibold text-white mb-2">Hi! I'm your Creator Coach</h4>
                <p className="text-sm text-gray-400 mb-4">
                  I can help you with platform features, content ideas, pricing strategies, and even generate promo scripts for your niche!
                </p>
                <p className="text-xs text-gray-500">
                  Try the quick actions above or ask me anything
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <SuccessCoachMessage key={message.id} message={message} />
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/20 rounded-tl-sm">
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
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && !isLoading && (
            <div className="px-4 py-2 border-t border-white/5">
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-2.5 py-1 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 border border-white/10 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {(error || voiceError) && (
            <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error || voiceError}
            </div>
          )}

          {/* Listening indicator */}
          {isListening && (
            <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
              <span>{voiceTranscript || 'Listening...'}</span>
            </div>
          )}

          {/* Input area */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
                disabled={isLoading || isListening}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
              />
              {/* Mic button */}
              {isVoiceSupported && (
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={isLoading}
                  className={`px-3 py-2.5 rounded-xl transition-all ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isListening}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white hover:from-purple-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </>
      )}

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
