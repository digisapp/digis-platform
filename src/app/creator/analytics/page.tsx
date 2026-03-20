'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  BarChart3, Users, Eye, Phone, Video,
  DollarSign, Crown, ChevronDown, Image,
  Play, ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

interface AnalyticsData {
  period: number;
  dailyEarnings: Array<{ day: string; earnings: number }>;
  revenueBySource: Array<{ source: string; total: number }>;
  topContent: Array<{
    id: string; type: string; thumbnailUrl: string | null; previewUrl: string | null;
    priceCoins: number | null; likeCount: number; purchaseCount: number; totalRevenue: number;
  }>;
  topClips: Array<{
    id: string; title: string; thumbnailUrl: string | null;
    viewCount: number; likeCount: number; shareCount: number; createdAt: string;
  }>;
  followerGrowth: Array<{ day: string; newFollowers: number }>;
  topFans: Array<{
    fanId: string; totalSpent: number; tier: string;
    username: string | null; displayName: string | null; avatarUrl: string | null;
  }>;
  streams: { totalStreams: number; totalViews: number; avgViewers: number; totalHours: number };
  calls: { totalCalls: number; totalMinutes: number; totalEarnings: number; avgRating: number };
}

const PERIODS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
];

const SOURCE_COLORS: Record<string, string> = {
  streams: '#ef4444',
  calls: '#3b82f6',
  cloud: '#06b6d4',
  subscriptions: '#a855f7',
  messages: '#f59e0b',
  collections: '#10b981',
  bookings: '#ec4899',
  other: '#6b7280',
};

const SOURCE_LABELS: Record<string, string> = {
  streams: 'Streams & Tips',
  calls: 'Calls',
  cloud: 'Cloud Content',
  subscriptions: 'Subscriptions',
  messages: 'Messages',
  collections: 'Collections',
  bookings: 'Bookings',
  other: 'Other',
};

const TIER_COLORS: Record<string, string> = {
  diamond: 'text-cyan-300',
  platinum: 'text-purple-300',
  gold: 'text-yellow-400',
  silver: 'text-gray-300',
  bronze: 'text-orange-400',
  none: 'text-gray-500',
};

const TIER_BADGES: Record<string, string> = {
  diamond: '💎',
  platinum: '✨',
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
  none: '',
};

export default function CreatorAnalyticsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const translatedPeriods = [
    { value: 7, label: t.analytics.days7 },
    { value: 30, label: t.analytics.days30 },
    { value: 90, label: t.analytics.days90 },
    { value: 365, label: t.analytics.year1 },
  ];

  const translatedSourceLabels: Record<string, string> = {
    streams: t.analytics.streamsAndTips,
    calls: t.analytics.calls,
    cloud: t.analytics.cloudContent,
    subscriptions: t.analytics.subscriptions,
    messages: t.analytics.messages,
    collections: t.analytics.collections,
    bookings: t.analytics.bookings,
    other: t.analytics.other,
  };

  const fetchAnalytics = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/creator/analytics/detailed?days=${days}`);
      if (res.status === 401) { router.push('/login'); return; }
      if (res.status === 403) { router.push('/'); return; }
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  const totalEarnings = data?.revenueBySource.reduce((s, r) => s + r.total, 0) || 0;
  const totalNewFollowers = data?.followerGrowth.reduce((s, d) => s + d.newFollowers, 0) || 0;

  const formatDay = (day: string) => {
    const d = new Date(day);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="container mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-10 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-green-400" />
            <h1 className="text-2xl font-bold text-white">{t.analytics.analytics}</h1>
          </div>

          {/* Period Selector */}
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-green-500/30 transition-all text-sm"
            >
              <span className="text-gray-300">{translatedPeriods.find(p => p.value === period)?.label}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showPeriodDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPeriodDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 py-1 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-50 min-w-[120px]">
                  {translatedPeriods.map(p => (
                    <button
                      key={p.value}
                      onClick={() => { setPeriod(p.value); setShowPeriodDropdown(false); }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        period === p.value ? 'text-green-400 bg-green-500/10' : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={DollarSign} label={t.analytics.earnings} value={`${totalEarnings.toLocaleString()} coins`} subValue={`≈ $${(totalEarnings * 0.1).toFixed(0)}`} color="green" />
          <StatCard icon={Users} label={t.analytics.newFollowers} value={`+${totalNewFollowers}`} color="purple" />
          <StatCard icon={Eye} label={t.analytics.streamViews} value={data?.streams.totalViews.toLocaleString() || '0'} subValue={`${data?.streams.totalStreams || 0} streams`} color="red" />
          <StatCard icon={Phone} label={t.analytics.calls} value={`${data?.calls.totalCalls || 0}`} subValue={`${data?.calls.totalMinutes || 0} min`} color="blue" />
        </div>

        {/* Earnings Chart */}
        <div className="mb-6 p-5 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-medium text-gray-400 mb-4">{t.analytics.earningsOverTime}</h3>
          {data && data.dailyEarnings.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.dailyEarnings}>
                <defs>
                  <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 12, color: '#fff', fontSize: 13 }}
                  labelFormatter={(l) => new Date(l).toLocaleDateString()}
                  formatter={(v: number) => [`${v.toLocaleString()} coins`, t.analytics.earnings]}
                />
                <Area type="monotone" dataKey="earnings" stroke="#22c55e" fill="url(#earningsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">{t.analytics.noEarningsData}</div>
          )}
        </div>

        {/* Revenue Breakdown + Follower Growth */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Revenue by Source */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-sm font-medium text-gray-400 mb-4">{t.analytics.revenueBreakdown}</h3>
            {data && data.revenueBySource.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-[140px] h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.revenueBySource}
                        dataKey="total"
                        nameKey="source"
                        cx="50%" cy="50%"
                        innerRadius={40} outerRadius={65}
                        paddingAngle={2}
                      >
                        {data.revenueBySource.map((entry) => (
                          <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] || '#6b7280'} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {data.revenueBySource.map(r => (
                    <div key={r.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[r.source] || '#6b7280' }} />
                        <span className="text-xs text-gray-300">{translatedSourceLabels[r.source] || r.source}</span>
                      </div>
                      <span className="text-xs font-medium text-white">{r.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[140px] flex items-center justify-center text-gray-500 text-sm">{t.analytics.noRevenueData}</div>
            )}
          </div>

          {/* Follower Growth */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-sm font-medium text-gray-400 mb-4">{t.analytics.followerGrowth}</h3>
            {data && data.followerGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={data.followerGrowth}>
                  <XAxis dataKey="day" tickFormatter={formatDay} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 12, color: '#fff', fontSize: 13 }}
                    labelFormatter={(l) => new Date(l).toLocaleDateString()}
                    formatter={(v: number) => [`+${v}`, t.analytics.newFollowers]}
                  />
                  <Bar dataKey="newFollowers" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[140px] flex items-center justify-center text-gray-500 text-sm">{t.analytics.noFollowerData}</div>
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Stream Stats */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Video className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-medium text-gray-400">{t.nav.streams}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-white">{data?.streams.totalStreams || 0}</p>
                <p className="text-xs text-gray-500">{t.analytics.totalStreams}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{(data?.streams.totalViews || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500">{t.analytics.totalViews}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{data?.streams.avgViewers || 0}</p>
                <p className="text-xs text-gray-500">{t.analytics.avgPeakViewers}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{data?.streams.totalHours || 0}h</p>
                <p className="text-xs text-gray-500">{t.analytics.hoursStreamed}</p>
              </div>
            </div>
          </div>

          {/* Call Stats */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-gray-400">{t.analytics.calls}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-white">{data?.calls.totalCalls || 0}</p>
                <p className="text-xs text-gray-500">{t.analytics.totalCalls}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{data?.calls.totalMinutes || 0}</p>
                <p className="text-xs text-gray-500">{t.analytics.minutes}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{(data?.calls.totalEarnings || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500">{t.analytics.coinsEarned}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {data?.calls.avgRating ? `${data.calls.avgRating}` : '—'}
                </p>
                <p className="text-xs text-gray-500">{t.analytics.avgRating}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Content + Top Clips */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Top Cloud Content */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Image className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-medium text-gray-400">{t.analytics.topCloudContent}</h3>
            </div>
            {data && data.topContent.length > 0 ? (
              <div className="space-y-3">
                {data.topContent.slice(0, 5).map((item, i) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 w-4">{i + 1}</span>
                    <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
                      {(item.thumbnailUrl || item.previewUrl) ? (
                        <img src={item.thumbnailUrl || item.previewUrl!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {item.type === 'video' ? <Play className="w-4 h-4 text-gray-600" /> : <Image className="w-4 h-4 text-gray-600" />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300">{item.purchaseCount} purchases</p>
                      <p className="text-xs text-gray-500">{item.likeCount} likes</p>
                    </div>
                    <span className="text-sm font-semibold text-green-400">{item.totalRevenue.toLocaleString()} coins</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">{t.analytics.noContentYet}</p>
            )}
          </div>

          {/* Top Clips */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Play className="w-4 h-4 text-pink-400" />
              <h3 className="text-sm font-medium text-gray-400">{t.analytics.topClips}</h3>
            </div>
            {data && data.topClips.length > 0 ? (
              <div className="space-y-3">
                {data.topClips.slice(0, 5).map((clip, i) => (
                  <div key={clip.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 w-4">{i + 1}</span>
                    <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
                      {clip.thumbnailUrl ? (
                        <img src={clip.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">{clip.title || 'Untitled'}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{clip.viewCount.toLocaleString()} views</span>
                        <span>·</span>
                        <span>{clip.likeCount} likes</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">{t.analytics.noClipsYet}</p>
            )}
          </div>
        </div>

        {/* Top Fans */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-medium text-gray-400">{t.analytics.topFans}</h3>
            </div>
            <button
              onClick={() => router.push('/creator/fans')}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              {t.analytics.viewAll} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {data && data.topFans.length > 0 ? (
            <div className="space-y-3">
              {data.topFans.map((fan, i) => (
                <div key={fan.fanId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 w-4">{i + 1}</span>
                  <div className="w-9 h-9 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                    {fan.avatarUrl ? (
                      <img src={fan.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-bold">
                        {(fan.displayName || fan.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-white truncate">{fan.displayName || fan.username}</p>
                      {TIER_BADGES[fan.tier] && <span className="text-xs">{TIER_BADGES[fan.tier]}</span>}
                    </div>
                    <p className={`text-xs capitalize ${TIER_COLORS[fan.tier] || 'text-gray-500'}`}>
                      {fan.tier !== 'none' ? fan.tier : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-400">{fan.totalSpent.toLocaleString()} coins</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">{t.analytics.noFanData}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, color }: {
  icon: any; label: string; value: string; subValue?: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    green: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
    purple: 'from-purple-500/10 to-fuchsia-500/10 border-purple-500/20',
    red: 'from-red-500/10 to-pink-500/10 border-red-500/20',
    blue: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20',
  };
  const iconColorMap: Record<string, string> = {
    green: 'text-green-400', purple: 'text-purple-400', red: 'text-red-400', blue: 'text-blue-400',
  };

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${colorMap[color]} border`}>
      <Icon className={`w-4 h-4 ${iconColorMap[color]} mb-2`} />
      <p className="text-lg font-bold text-white truncate">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
      {subValue && <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>}
    </div>
  );
}
