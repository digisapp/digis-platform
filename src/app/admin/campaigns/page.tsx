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

  // Config
  const [config, setConfig] = useState<BatchConfig>({
    batchSize: 5,
    minDelay: 30000,
    maxDelay: 90000,
    dailyLimit: 50,
  });

  // Test email
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  // Custom recipients (paste emails)
  const [customEmails, setCustomEmails] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

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
        body: JSON.stringify({ action: 'test', testEmail }),
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
          action: 'batch',
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
          action: 'batch',
          recipients: emails.map(email => ({
            email,
            inviteUrl: 'https://digis.cc/signup?ref=invite',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <MobileHeader />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Mail className="w-7 h-7 text-cyan-400" />
              Creator Invite Campaigns
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Send batch invite emails via examodels.com
            </p>
          </div>
          <GlassButton variant="ghost" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </GlassButton>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
          </div>
        )}

        {/* Test Email Section */}
        <GlassCard className="p-5">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TestTube className="w-5 h-5 text-cyan-400" />
            Test Email
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
                <option value={15000}>15 sec</option>
                <option value={30000}>30 sec</option>
                <option value={45000}>45 sec</option>
                <option value={60000}>60 sec</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Max Delay</label>
              <select
                value={config.maxDelay}
                onChange={(e) => setConfig({ ...config, maxDelay: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value={60000}>60 sec</option>
                <option value={90000}>90 sec</option>
                <option value={120000}>120 sec</option>
                <option value={180000}>180 sec</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Daily Limit</label>
              <select
                value={config.dailyLimit}
                onChange={(e) => setConfig({ ...config, dailyLimit: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                {[25, 50, 75, 100].map(n => (
                  <option key={n} value={n}>{n} emails</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Random delays between batches help avoid spam filters
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
              Pending Invites ({readyToInvite.length})
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
                  onClick={() => toggleRecipient(recipient.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    selectedRecipients.has(recipient.id)
                      ? 'bg-cyan-500/20 border border-cyan-500/50'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                      selectedRecipients.has(recipient.id)
                        ? 'bg-cyan-500 border-cyan-500'
                        : 'border-white/30'
                    }`}
                  >
                    {selectedRecipients.has(recipient.id) && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{recipient.email}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {recipient.name || 'No name'} • {new Date(recipient.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
