'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import {
  Mail,
  Send,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Pause,
  RefreshCw,
  Upload,
  TestTube,
  Settings,
  AlertTriangle,
  Sparkles,
  UserPlus,
  Copy,
  X,
  Key,
} from 'lucide-react';

interface InviteRecipient {
  id: string;
  email: string;
  name?: string;
  inviteUrl: string;
  createdAt: string;
}

interface CampaignStats {
  total: number;
  pending: number;
  claimed: number;
  expired: number;
  revoked: number;
  withEmail: number;
  emailed: number;
  pendingNotEmailed: number;
}

interface BatchConfig {
  batchSize: number;
  minDelay: number;
  maxDelay: number;
  dailyLimit: number;
}

interface SendResult {
  email: string;
  success: boolean;
  error?: string;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [readyToInvite, setReadyToInvite] = useState<InviteRecipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());

  // Campaign state
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0, failed: 0 });
  const [sendResults, setSendResults] = useState<SendResult[]>([]);

  // Config - use fast delays to avoid Vercel timeout (max 10s function duration)
  const [config, setConfig] = useState<BatchConfig>({
    batchSize: 10,
    minDelay: 1000,
    maxDelay: 2000,
    dailyLimit: 100,
  });

  // Test email
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  // Custom recipients (paste emails)
  const [customEmails, setCustomEmails] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Credentials modal
  const [credentialsModal, setCredentialsModal] = useState<{
    show: boolean;
    email: string;
    username: string;
    password: string;
  } | null>(null);
  const [creatingAccount, setCreatingAccount] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Template selection
  const [useExaTemplate, setUseExaTemplate] = useState(true); // Default to EXA Models template

  // Fetch data
  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/campaigns/invite');
      if (res.status === 401) {
        router.push('/');
        return;
      }
      const data = await res.json();
      setStats(data.stats);
      setReadyToInvite(data.readyToInvite || []);
    } catch (err) {
      console.error('Failed to fetch campaign data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Send test email
  const handleTestEmail = async () => {
    if (!testEmail) return;
    setTestStatus('sending');
    setTestError(null);
    try {
      const res = await fetch('/api/admin/campaigns/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: useExaTemplate ? 'test-exa' : 'test',
          testEmail
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus('success');
        setTestError(null);
      } else {
        setTestStatus('error');
        setTestError(data.error || data.message || 'Unknown error');
      }
      setTimeout(() => setTestStatus('idle'), 5000);
    } catch (err) {
      setTestStatus('error');
      setTestError(err instanceof Error ? err.message : 'Network error');
      setTimeout(() => setTestStatus('idle'), 5000);
    }
  };

  // Toggle recipient selection
  const toggleRecipient = (id: string) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecipients(newSelected);
  };

  // Select all
  const selectAll = () => {
    if (selectedRecipients.size === readyToInvite.length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(readyToInvite.map(r => r.id)));
    }
  };

  // Start campaign
  const startCampaign = async () => {
    const recipients = readyToInvite.filter(r => selectedRecipients.has(r.id));
    if (recipients.length === 0) return;

    setIsSending(true);
    setSendProgress({ sent: 0, total: recipients.length, failed: 0 });
    setSendResults([]);

    try {
      const res = await fetch('/api/admin/campaigns/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: useExaTemplate ? 'exa-batch' : 'batch',
          recipients: recipients.map(r => ({
            email: r.email,
            name: r.name,
            inviteUrl: r.inviteUrl,
          })),
          config,
        }),
      });

      const data = await res.json();
      setSendProgress({ sent: data.sent, total: recipients.length, failed: data.failed });
      setSendResults(data.results || []);
    } catch (err) {
      console.error('Campaign error:', err);
    } finally {
      setIsSending(false);
      fetchData(); // Refresh data
    }
  };

  // Parse custom emails and send
  const sendCustomEmails = async () => {
    const emails = customEmails
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emails.length === 0) return;

    setIsSending(true);
    setSendProgress({ sent: 0, total: emails.length, failed: 0 });

    try {
      const res = await fetch('/api/admin/campaigns/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: useExaTemplate ? 'exa-batch' : 'batch',
          recipients: emails.map(email => ({
            email,
            inviteUrl: `${process.env.NEXT_PUBLIC_URL || 'https://digis.cc'}/signup?ref=invite`,
          })),
          config,
        }),
      });

      const data = await res.json();
      setSendProgress({ sent: data.sent, total: emails.length, failed: data.failed });
      setSendResults(data.results || []);
      setCustomEmails('');
      setShowCustomInput(false);
    } catch (err) {
      console.error('Campaign error:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Create account with generated password
  const createAccount = async (recipient: InviteRecipient) => {
    setCreatingAccount(recipient.id);
    try {
      const res = await fetch('/api/admin/campaigns/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-account',
          inviteId: recipient.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setCredentialsModal({
          show: true,
          email: data.email,
          username: data.username,
          password: data.password,
        });
        // Remove from list
        setReadyToInvite(prev => prev.filter(r => r.id !== recipient.id));
        setSelectedRecipients(prev => {
          const newSet = new Set(prev);
          newSet.delete(recipient.id);
          return newSet;
        });
      } else {
        alert(data.error || 'Failed to create account');
      }
    } catch (err) {
      alert('Failed to create account');
      console.error(err);
    } finally {
      setCreatingAccount(null);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Copy all credentials
  const copyAllCredentials = async () => {
    if (!credentialsModal) return;
    const text = `Email: ${credentialsModal.email}\nPassword: ${credentialsModal.password}`;
    await navigator.clipboard.writeText(text);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center md:pl-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 md:pl-20">
      <MobileHeader />
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-pink-400" />
              EXA Models Campaign
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Send invite emails to {stats?.pendingNotEmailed?.toLocaleString() || '...'} pending creators via examodels.com
            </p>
          </div>
          <GlassButton variant="ghost" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </GlassButton>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <GlassCard className="p-4 text-center">
              <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-gray-400">Total Invites</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Clock className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.pending}</div>
              <div className="text-xs text-gray-400">Pending</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.claimed}</div>
              <div className="text-xs text-gray-400">Claimed</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Mail className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.withEmail}</div>
              <div className="text-xs text-gray-400">With Email</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Send className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.emailed}</div>
              <div className="text-xs text-gray-400">Emailed</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Sparkles className="w-6 h-6 text-pink-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.pendingNotEmailed}</div>
              <div className="text-xs text-gray-400">Ready to Send</div>
            </GlassCard>
          </div>
        )}

        {/* Template Selection */}
        <GlassCard className="p-5 border-2 border-pink-500/30 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                Email Template
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {useExaTemplate
                  ? '"Create Content while Traveling the World" - Fun & vibey template'
                  : 'Standard "Stop leaving money on the table" template'}
              </p>
            </div>
            <button
              onClick={() => setUseExaTemplate(!useExaTemplate)}
              className={`relative w-20 h-10 rounded-full transition-all ${
                useExaTemplate
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500'
                  : 'bg-white/10'
              }`}
            >
              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs font-medium text-white/60 pl-1">
                STD
              </span>
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-medium text-white/60 pr-1">
                EXA
              </span>
              <div
                className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-lg transition-all flex items-center justify-center ${
                  useExaTemplate ? 'left-[44px]' : 'left-1'
                }`}
              >
                {useExaTemplate ? (
                  <Sparkles className="w-4 h-4 text-pink-500" />
                ) : (
                  <Mail className="w-4 h-4 text-gray-600" />
                )}
              </div>
            </button>
          </div>
          {useExaTemplate && (
            <div className="mt-4 p-3 bg-black/30 rounded-xl border border-white/5">
              <p className="text-sm text-white/80 font-medium mb-1">
                Subject: "[Name], Create Content while Traveling the World 🌍✨"
              </p>
              <p className="text-xs text-gray-400">
                Features: Paid Video Calls, AI Twin, Go Live GRWM, Sell Content, Training, Virtual Dates
              </p>
            </div>
          )}
        </GlassCard>

        {/* Test Email Section */}
        <GlassCard className="p-5">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TestTube className="w-5 h-5 text-cyan-400" />
            Test Email
            {useExaTemplate && (
              <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full">
                EXA Template
              </span>
            )}
          </h3>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter test email..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
            <GlassButton
              variant="cyan"
              onClick={handleTestEmail}
              disabled={!testEmail || testStatus === 'sending'}
            >
              {testStatus === 'sending' ? (
                <LoadingSpinner size="sm" />
              ) : testStatus === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : testStatus === 'error' ? (
                <XCircle className="w-5 h-5 text-red-400" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test
                </>
              )}
            </GlassButton>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Sends from hello@examodels.com
          </p>
          {testError && (
            <div className="mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{testError}</p>
            </div>
          )}
        </GlassCard>

        {/* Batch Config */}
        <GlassCard className="p-5">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            Batch Settings
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Batch Size</label>
              <select
                value={config.batchSize}
                onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                {[3, 5, 7, 10].map(n => (
                  <option key={n} value={n}>{n} emails</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Min Delay</label>
              <select
                value={config.minDelay}
                onChange={(e) => setConfig({ ...config, minDelay: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value={500}>0.5 sec</option>
                <option value={1000}>1 sec</option>
                <option value={2000}>2 sec</option>
                <option value={3000}>3 sec</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Max Delay</label>
              <select
                value={config.maxDelay}
                onChange={(e) => setConfig({ ...config, maxDelay: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value={1000}>1 sec</option>
                <option value={2000}>2 sec</option>
                <option value={3000}>3 sec</option>
                <option value={5000}>5 sec</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Daily Limit</label>
              <select
                value={config.dailyLimit}
                onChange={(e) => setConfig({ ...config, dailyLimit: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                {[50, 100, 150, 200, 250].map(n => (
                  <option key={n} value={n}>{n} emails</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Fast delays (1-2s) work best with Vercel. Resend handles rate limiting automatically.
          </p>
        </GlassCard>

        {/* Custom Email Input */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-pink-400" />
              Custom Email List
            </h3>
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomInput(!showCustomInput)}
            >
              {showCustomInput ? 'Hide' : 'Show'}
            </GlassButton>
          </div>

          {showCustomInput && (
            <>
              <textarea
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
                placeholder="Paste emails (one per line, or comma/semicolon separated)..."
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 font-mono text-sm"
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-500">
                  {customEmails.split(/[\n,;]+/).filter(e => e.trim() && e.includes('@')).length} valid emails detected
                </p>
                <GlassButton
                  variant="pink"
                  onClick={sendCustomEmails}
                  disabled={isSending || !customEmails.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to Custom List
                </GlassButton>
              </div>
            </>
          )}
        </GlassCard>

        {/* Progress */}
        {(isSending || sendResults.length > 0) && (
          <GlassCard className="p-5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              {isSending ? (
                <>
                  <LoadingSpinner size="sm" />
                  Sending Campaign...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Campaign Complete
                </>
              )}
            </h3>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Progress</span>
                <span className="text-white">
                  {sendProgress.sent} / {sendProgress.total} sent
                  {sendProgress.failed > 0 && (
                    <span className="text-red-400 ml-2">({sendProgress.failed} failed)</span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${sendProgress.total > 0 ? (sendProgress.sent / sendProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Results */}
            {sendResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {sendResults.map((result, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                      result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    <span className="text-white truncate">{result.email}</span>
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <span className="text-red-400 text-xs truncate ml-2">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {/* Ready to Invite List */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Ready to Email ({readyToInvite.length})
            </h3>
            <div className="flex gap-2">
              <GlassButton variant="ghost" size="sm" onClick={selectAll}>
                {selectedRecipients.size === readyToInvite.length ? 'Deselect All' : 'Select All'}
              </GlassButton>
              <GlassButton
                variant="cyan"
                size="sm"
                onClick={startCampaign}
                disabled={selectedRecipients.size === 0 || isSending}
              >
                <Play className="w-4 h-4 mr-1" />
                Send ({selectedRecipients.size})
              </GlassButton>
            </div>
          </div>

          {readyToInvite.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pending invites with emails</p>
              <p className="text-sm">Add creators via the Onboarding page first</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {readyToInvite.map((recipient) => (
                <div
                  key={recipient.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selectedRecipients.has(recipient.id)
                      ? 'bg-cyan-500/20 border border-cyan-500/50'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <div
                    onClick={() => toggleRecipient(recipient.id)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer ${
                      selectedRecipients.has(recipient.id)
                        ? 'bg-cyan-500 border-cyan-500'
                        : 'border-white/30'
                    }`}
                  >
                    {selectedRecipients.has(recipient.id) && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => toggleRecipient(recipient.id)}>
                    <p className="text-white font-medium truncate cursor-pointer">{recipient.email}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {recipient.name || 'No name'} • {new Date(recipient.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createAccount(recipient);
                    }}
                    disabled={creatingAccount === recipient.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-400 text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {creatingAccount === recipient.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Create
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Credentials Modal */}
      {credentialsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-green-400" />
                Account Created
              </h3>
              <button
                onClick={() => setCredentialsModal(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Email</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={credentialsModal.email}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(credentialsModal.email, 'email')}
                    className={`px-3 rounded-lg transition-all ${
                      copiedField === 'email'
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    {copiedField === 'email' ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={credentialsModal.password}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(credentialsModal.password, 'password')}
                    className={`px-3 rounded-lg transition-all ${
                      copiedField === 'password'
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    {copiedField === 'password' ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Username</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`@${credentialsModal.username}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(credentialsModal.username, 'username')}
                    className={`px-3 rounded-lg transition-all ${
                      copiedField === 'username'
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    }`}
                  >
                    {copiedField === 'username' ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Copy All Button */}
            <button
              onClick={copyAllCredentials}
              className={`w-full mt-6 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                copiedField === 'all'
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90'
              }`}
            >
              {copiedField === 'all' ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Email & Password
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Send these credentials to the creator. They can log in at digis.cc
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
