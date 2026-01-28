'use client';

import { useState, useCallback, useEffect } from 'react';
import type { CoachMessage, CoachChatHistory, ScriptGeneratorState } from '@/lib/coach/types';

const STORAGE_KEY_PREFIX = 'digis_coach_chat_';
const MAX_HISTORY_MESSAGES = 50;

export function useCoachChat(creatorId: string) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Script generator state
  const [scriptState, setScriptState] = useState<ScriptGeneratorState | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Load chat history from localStorage on mount
  useEffect(() => {
    if (!creatorId) return;

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${creatorId}`);
      if (stored) {
        const history: CoachChatHistory = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = history.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
      }
    } catch (err) {
      console.error('Failed to load coach chat history:', err);
    }
  }, [creatorId]);

  // Save chat history to localStorage
  const saveHistory = useCallback((newMessages: CoachMessage[]) => {
    if (!creatorId) return;

    try {
      const history: CoachChatHistory = {
        creatorId,
        messages: newMessages.slice(-MAX_HISTORY_MESSAGES),
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${creatorId}`, JSON.stringify(history));
    } catch (err) {
      console.error('Failed to save coach chat history:', err);
    }
  }, [creatorId]);

  // Send a message to the coach
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Add user message immediately
    const userMessage: CoachMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const response = await fetch('/api/creator/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-10) // Send last 10 messages for context
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add assistant response
      const assistantMessage: CoachMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date()
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      saveHistory(finalMessages);

      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }

    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      // Remove the user message if we failed to get a response
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, saveHistory]);

  // Start the script generator flow
  const startScriptGenerator = useCallback(() => {
    setScriptState({
      step: 'niche',
      niche: '',
      length: '30sec',
      vibe: 'gen-z'
    });
  }, []);

  // Update script generator state
  const updateScriptState = useCallback((updates: Partial<ScriptGeneratorState>) => {
    setScriptState(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Generate the script
  const generateScript = useCallback(async () => {
    if (!scriptState || !scriptState.niche) return;

    setIsGeneratingScript(true);
    setError(null);

    try {
      const response = await fetch('/api/creator/coach/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: scriptState.niche,
          length: scriptState.length,
          vibe: scriptState.vibe
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate script');
      }

      // Update state with generated script
      setScriptState(prev => prev ? {
        ...prev,
        step: 'result',
        generatedScript: data.script
      } : null);

      // Also add to chat history
      const userMessage: CoachMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: `Generate a ${scriptState.length} ${scriptState.vibe} promo script for ${scriptState.niche}`,
        timestamp: new Date(),
        metadata: {
          actionType: 'script',
          scriptType: scriptState.length,
          niche: scriptState.niche,
          vibe: scriptState.vibe
        }
      };

      const assistantMessage: CoachMessage = {
        id: `assistant-${Date.now() + 1}`,
        role: 'assistant',
        content: data.script,
        timestamp: new Date(),
        metadata: {
          actionType: 'script',
          scriptType: scriptState.length,
          niche: scriptState.niche,
          vibe: scriptState.vibe
        }
      };

      const finalMessages = [...messages, userMessage, assistantMessage];
      setMessages(finalMessages);
      saveHistory(finalMessages);

    } catch (err: any) {
      setError(err.message || 'Failed to generate script');
    } finally {
      setIsGeneratingScript(false);
    }
  }, [scriptState, messages, saveHistory]);

  // Close the script generator
  const closeScriptGenerator = useCallback(() => {
    setScriptState(null);
  }, []);

  // Clear chat history
  const clearHistory = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
    if (creatorId) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${creatorId}`);
    }
  }, [creatorId]);

  return {
    messages,
    isLoading,
    error,
    suggestions,
    sendMessage,
    clearHistory,
    // Script generator
    scriptState,
    isGeneratingScript,
    startScriptGenerator,
    updateScriptState,
    generateScript,
    closeScriptGenerator
  };
}
