'use client';

import { useState } from 'react';
import { X, Plus, Trash2, BarChart2 } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { useToastContext } from '@/context/ToastContext';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  onPollCreated: () => void;
}

export function CreatePollModal({ isOpen, onClose, streamId, onPollCreated }: CreatePollModalProps) {
  const { showError, showSuccess } = useToastContext();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState(60); // seconds
  const [creating, setCreating] = useState(false);

  const handleAddOption = () => {
    if (options.length < 4) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!question.trim()) {
      showError('Please enter a question');
      return;
    }

    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) {
      showError('Please enter at least 2 options');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/streams/${streamId}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          options: validOptions,
          durationSeconds: duration,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create poll');
      }

      showSuccess('Poll created!');
      onPollCreated();
      handleClose();
    } catch (error: any) {
      showError(error.message || 'Failed to create poll');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setQuestion('');
    setOptions(['', '']);
    setDuration(60);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={handleClose} />
      <div className="relative backdrop-blur-xl bg-black/90 rounded-3xl border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)] p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Poll</h2>
              <p className="text-sm text-gray-400">Ask your viewers a question</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What should I do next?"
              maxLength={100}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Options (2-4)
            </label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    maxLength={50}
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-2.5 hover:bg-red-500/20 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="w-full py-2.5 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              )}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { sec: 60, label: '1m' },
                { sec: 300, label: '5m' },
                { sec: 1800, label: '30m' },
                { sec: 3600, label: '1hr' },
              ].map(({ sec, label }) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setDuration(sec)}
                  className={`py-2 rounded-xl text-sm font-medium transition-all ${
                    duration === sec
                      ? 'bg-purple-500/30 border-purple-500/50 text-purple-300 border'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <GlassButton
            type="submit"
            variant="gradient"
            size="lg"
            disabled={creating}
            shimmer
            glow
            className="w-full"
          >
            {creating ? 'Creating...' : 'Start Poll'}
          </GlassButton>
        </form>
      </div>
    </div>
  );
}
