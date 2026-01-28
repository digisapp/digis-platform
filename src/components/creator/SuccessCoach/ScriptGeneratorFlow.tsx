'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Copy, Check, RefreshCw, X } from 'lucide-react';
import {
  NICHE_OPTIONS,
  VIBE_OPTIONS,
  LENGTH_OPTIONS,
  type ScriptGeneratorState
} from '@/lib/coach/types';

interface ScriptGeneratorFlowProps {
  state: ScriptGeneratorState;
  onUpdate: (updates: Partial<ScriptGeneratorState>) => void;
  onGenerate: () => void;
  onClose: () => void;
  isGenerating: boolean;
}

export function ScriptGeneratorFlow({
  state,
  onUpdate,
  onGenerate,
  onClose,
  isGenerating
}: ScriptGeneratorFlowProps) {
  const [customNiche, setCustomNiche] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!state.generatedScript) return;
    try {
      await navigator.clipboard.writeText(state.generatedScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRegenerate = () => {
    onUpdate({ step: 'niche', generatedScript: undefined });
  };

  const goToNextStep = () => {
    if (state.step === 'niche') {
      onUpdate({ step: 'length' });
    } else if (state.step === 'length') {
      onUpdate({ step: 'vibe' });
    } else if (state.step === 'vibe') {
      onGenerate();
    }
  };

  const goToPrevStep = () => {
    if (state.step === 'length') {
      onUpdate({ step: 'niche' });
    } else if (state.step === 'vibe') {
      onUpdate({ step: 'length' });
    } else if (state.step === 'result') {
      onUpdate({ step: 'vibe', generatedScript: undefined });
    }
  };

  const canProceed = () => {
    if (state.step === 'niche') return !!state.niche;
    if (state.step === 'length') return !!state.length;
    if (state.step === 'vibe') return !!state.vibe;
    return false;
  };

  // Step indicator
  const steps = ['niche', 'length', 'vibe', 'result'];
  const currentStepIndex = steps.indexOf(state.step);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span className="font-semibold text-white">Script Generator</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Step indicator */}
      {state.step !== 'result' && (
        <div className="flex items-center gap-2">
          {steps.slice(0, 3).map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index <= currentStepIndex
                  ? 'bg-yellow-500 text-black'
                  : 'bg-white/10 text-gray-500'
              }`}>
                {index + 1}
              </div>
              {index < 2 && (
                <div className={`w-8 h-0.5 mx-1 ${
                  index < currentStepIndex ? 'bg-yellow-500' : 'bg-white/10'
                }`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step content */}
      {state.step === 'niche' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">What's your content niche?</p>
          <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
            {NICHE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onUpdate({ niche: option.value });
                  setCustomNiche('');
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                  state.niche === option.value
                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 border'
                    : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {state.niche === 'other' && (
            <input
              type="text"
              value={customNiche}
              onChange={(e) => {
                setCustomNiche(e.target.value);
                onUpdate({ niche: e.target.value || 'other' });
              }}
              placeholder="Enter your niche..."
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
            />
          )}
        </div>
      )}

      {state.step === 'length' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">How long should the script be?</p>
          <div className="space-y-2">
            {LENGTH_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onUpdate({ length: option.value })}
                className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                  state.length === option.value
                    ? 'bg-yellow-500/20 border-yellow-500/50 border'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <div className={`font-medium ${state.length === option.value ? 'text-yellow-300' : 'text-white'}`}>
                  {option.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {state.step === 'vibe' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">What vibe should it have?</p>
          <div className="space-y-2">
            {VIBE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onUpdate({ vibe: option.value })}
                className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                  state.vibe === option.value
                    ? 'bg-yellow-500/20 border-yellow-500/50 border'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <div className={`font-medium ${state.vibe === option.value ? 'text-yellow-300' : 'text-white'}`}>
                  {option.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {state.step === 'result' && state.generatedScript && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-yellow-400 font-medium">Your Script</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
              {state.generatedScript}
            </p>
          </div>
          <button
            onClick={handleRegenerate}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Generate Different Script
          </button>
        </div>
      )}

      {/* Loading state */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <div className="w-10 h-10 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Generating your script...</p>
        </div>
      )}

      {/* Navigation buttons */}
      {state.step !== 'result' && !isGenerating && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={state.step === 'niche' ? onClose : goToPrevStep}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {state.step === 'niche' ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={goToNextStep}
            disabled={!canProceed()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-yellow-500 text-black hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.step === 'vibe' ? (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Done button for result */}
      {state.step === 'result' && !isGenerating && (
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition-colors"
        >
          Done
        </button>
      )}
    </div>
  );
}
