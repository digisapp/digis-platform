'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, X, Bot, LoaderCircle } from 'lucide-react';
import type { ConfirmModal } from './types';

interface AiSettingsState {
  show: boolean;
  creatorId: string;
  creatorUsername: string;
  loading: boolean;
  settings: {
    enabled: boolean;
    textChatEnabled: boolean;
    voice: string;
    personalityPrompt: string | null;
    welcomeMessage: string | null;
    boundaryPrompt: string | null;
    pricePerMinute: number;
    minimumMinutes: number;
    maxSessionMinutes: number;
    textPricePerMessage: number;
  } | null;
}

interface CommunityModalsProps {
  confirmModal: ConfirmModal | null;
  onCloseConfirm: () => void;
  toast: { message: string; type: 'success' | 'error' } | null;
  onCloseToast: () => void;
  aiSettingsModal: AiSettingsState | null;
  onCloseAiSettings: () => void;
  onSaveAiSettings: (settings: Record<string, unknown>) => Promise<void>;
}

const VOICES = ['ara', 'eve', 'mika', 'leo', 'rex', 'sal'];

function AiSettingsModalContent({ modal, onClose, onSave }: {
  modal: AiSettingsState;
  onClose: () => void;
  onSave: (settings: Record<string, unknown>) => Promise<void>;
}) {
  const s = modal.settings;
  const [enabled, setEnabled] = useState(s?.enabled ?? false);
  const [textChatEnabled, setTextChatEnabled] = useState(s?.textChatEnabled ?? false);
  const [voice, setVoice] = useState(s?.voice ?? 'ara');
  const [personalityPrompt, setPersonalityPrompt] = useState(s?.personalityPrompt ?? '');
  const [welcomeMessage, setWelcomeMessage] = useState(s?.welcomeMessage ?? '');
  const [boundaryPrompt, setBoundaryPrompt] = useState(s?.boundaryPrompt ?? '');
  const [pricePerMinute, setPricePerMinute] = useState(String(s?.pricePerMinute ?? 20));
  const [minimumMinutes, setMinimumMinutes] = useState(String(s?.minimumMinutes ?? 5));
  const [maxSessionMinutes, setMaxSessionMinutes] = useState(String(s?.maxSessionMinutes ?? 60));
  const [textPricePerMessage, setTextPricePerMessage] = useState(String(s?.textPricePerMessage ?? 5));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (s) {
      setEnabled(s.enabled);
      setTextChatEnabled(s.textChatEnabled);
      setVoice(s.voice);
      setPersonalityPrompt(s.personalityPrompt ?? '');
      setWelcomeMessage(s.welcomeMessage ?? '');
      setBoundaryPrompt(s.boundaryPrompt ?? '');
      setPricePerMinute(String(s.pricePerMinute));
      setMinimumMinutes(String(s.minimumMinutes));
      setMaxSessionMinutes(String(s.maxSessionMinutes));
      setTextPricePerMessage(String(s.textPricePerMessage));
    }
  }, [modal.settings]);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      enabled, textChatEnabled, voice,
      personalityPrompt: personalityPrompt || null,
      welcomeMessage: welcomeMessage || null,
      boundaryPrompt: boundaryPrompt || null,
      pricePerMinute: parseInt(pricePerMinute) || 20,
      minimumMinutes: parseInt(minimumMinutes) || 5,
      maxSessionMinutes: parseInt(maxSessionMinutes) || 60,
      textPricePerMessage: parseInt(textPricePerMessage) || 5,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-800 border border-white/10 rounded-2xl p-6 max-w-2xl w-full my-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20"><Bot className="w-5 h-5 text-purple-400" /></div>
            <div>
              <h3 className="text-lg font-semibold text-white">AI Twin Settings</h3>
              <p className="text-sm text-gray-400">@{modal.creatorUsername}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {modal.loading ? (
          <div className="flex justify-center py-8"><LoaderCircle className="w-8 h-8 text-purple-400 animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            {/* Toggles */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-white">AI Voice Calls</p>
                  <p className="text-xs text-gray-500">Enable AI twin voice sessions</p>
                </div>
                <button
                  onClick={() => setEnabled(!enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-purple-500' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : ''}`} />
                </button>
              </label>
              <label className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-white">Text Chat</p>
                  <p className="text-xs text-gray-500">Enable AI twin text chat</p>
                </div>
                <button
                  onClick={() => setTextChatEnabled(!textChatEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${textChatEnabled ? 'bg-cyan-500' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${textChatEnabled ? 'translate-x-5' : ''}`} />
                </button>
              </label>
            </div>

            {/* Voice */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Voice</label>
              <div className="flex flex-wrap gap-2">
                {VOICES.map(v => (
                  <button
                    key={v}
                    onClick={() => setVoice(v)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${voice === v ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Price/min (coins)', value: pricePerMinute, set: setPricePerMinute },
                { label: 'Min minutes', value: minimumMinutes, set: setMinimumMinutes },
                { label: 'Max minutes', value: maxSessionMinutes, set: setMaxSessionMinutes },
                { label: 'Text price/msg', value: textPricePerMessage, set: setTextPricePerMessage },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="text-xs text-gray-400 block mb-1">{label}</label>
                  <input
                    type="number"
                    value={value}
                    onChange={e => set(e.target.value)}
                    min={0}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              ))}
            </div>

            {/* Prompts */}
            {[
              { label: 'Personality Prompt', value: personalityPrompt, set: setPersonalityPrompt, placeholder: 'Describe the creator\'s personality...' },
              { label: 'Welcome Message', value: welcomeMessage, set: setWelcomeMessage, placeholder: 'Opening message for new sessions...' },
              { label: 'Boundary Prompt', value: boundaryPrompt, set: setBoundaryPrompt, placeholder: 'Topics/behaviors to avoid...' },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label}>
                <label className="text-sm text-gray-400 block mb-2">{label}</label>
                <textarea
                  value={value}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <LoaderCircle className="w-4 h-4 animate-spin" />}
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CommunityModals({ confirmModal, onCloseConfirm, toast, onCloseToast, aiSettingsModal, onCloseAiSettings, onSaveAiSettings }: CommunityModalsProps) {
  return (
    <>
      {aiSettingsModal?.show && (
        <AiSettingsModalContent modal={aiSettingsModal} onClose={onCloseAiSettings} onSave={onSaveAiSettings} />
      )}

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
