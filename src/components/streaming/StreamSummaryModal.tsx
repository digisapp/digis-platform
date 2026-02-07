'use client';

import Image from 'next/image';
import { Coins, Ticket } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';

export interface StreamSummaryData {
  duration: string;
  totalViewers: number;
  peakViewers: number;
  totalEarnings: number;
  topSupporters: Array<{ username: string; totalCoins: number }>;
  ticketStats?: {
    ticketsSold: number;
    ticketRevenue: number;
    ticketBuyers: Array<{ username: string; displayName: string | null; avatarUrl: string | null }>;
  };
  tipMenuStats?: {
    totalTipMenuCoins: number;
    totalPurchases: number;
    items: Array<{
      id: string;
      label: string;
      totalCoins: number;
      purchaseCount: number;
      purchasers: Array<{ username: string; amount: number }>;
    }>;
  };
}

interface StreamSummaryModalProps {
  summary: StreamSummaryData;
  onClose: () => void;
}

export function StreamSummaryModal({ summary, onClose }: StreamSummaryModalProps) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="relative backdrop-blur-xl bg-black/90 rounded-3xl border border-white/20 shadow-2xl p-6 md:p-8 max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Stream Complete!</h2>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 text-center">
              <div className="mb-2">
                <svg className="w-8 h-8 mx-auto text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-cyan-400">{summary.duration}</div>
              <div className="text-sm text-gray-200 font-medium">Duration</div>
            </div>
            <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 text-center">
              <div className="mb-2">
                <svg className="w-8 h-8 mx-auto text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-purple-400">{summary.totalViewers}</div>
              <div className="text-sm text-gray-200 font-medium">Total Views</div>
            </div>
            <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 text-center">
              <div className="mb-2">
                <svg className="w-8 h-8 mx-auto text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-pink-400">{summary.peakViewers}</div>
              <div className="text-sm text-gray-200 font-medium">Peak Viewers</div>
            </div>
            <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 text-center">
              <div className="mb-2">
                <Coins className="w-8 h-8 mx-auto text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-yellow-400">
                {(summary.totalEarnings || 0) + (summary.ticketStats?.ticketRevenue || 0)}
              </div>
              <div className="text-sm text-gray-200 font-medium">Total Coins Earned</div>
            </div>
          </div>

          {/* Ticket Sales Stats */}
          {summary.ticketStats && summary.ticketStats.ticketsSold > 0 && (
            <div className="mb-6 backdrop-blur-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-xl border border-amber-500/30 p-4">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-400" />
                Ticket Sales
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{summary.ticketStats.ticketsSold}</div>
                  <div className="text-xs text-gray-300">Tickets Sold</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400 flex items-center justify-center gap-1">
                    <Coins className="w-5 h-5" />
                    {summary.ticketStats.ticketRevenue}
                  </div>
                  <div className="text-xs text-gray-300">Ticket Revenue</div>
                </div>
              </div>
              {summary.ticketStats.ticketBuyers.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-300 mb-2">Ticket Buyers:</div>
                  <div className="flex flex-wrap gap-2">
                    {summary.ticketStats.ticketBuyers.map((buyer, index) => (
                      <div key={index} className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-full">
                        {buyer.avatarUrl ? (
                          <Image src={buyer.avatarUrl} alt={buyer.username} width={20} height={20} className="w-5 h-5 rounded-full object-cover" unoptimized />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-[10px] font-bold text-black">
                            {buyer.username?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-xs font-medium text-white">@{buyer.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Earnings Breakdown (if there were both tips and tickets) */}
          {summary.ticketStats && summary.ticketStats.ticketRevenue > 0 && summary.totalEarnings > 0 && (
            <div className="mb-6 text-sm text-gray-400 text-center">
              <span className="text-yellow-400">{summary.totalEarnings}</span> from tips/gifts + <span className="text-amber-400">{summary.ticketStats.ticketRevenue}</span> from tickets
            </div>
          )}

          {/* Menu Stats */}
          {summary.tipMenuStats && summary.tipMenuStats.totalPurchases > 0 && (
            <div className="mb-6 backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Menu Stats
              </h3>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-pink-400 flex items-center justify-center gap-2">
                  <Coins className="w-7 h-7 text-yellow-400" />
                  {summary.tipMenuStats.totalTipMenuCoins.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">
                  from {summary.tipMenuStats.totalPurchases} menu purchase{summary.tipMenuStats.totalPurchases !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="space-y-3">
                {summary.tipMenuStats.items.map((item) => (
                  <div key={item.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white">{item.label}</span>
                      <span className="text-pink-400 font-bold flex items-center gap-1">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        {item.totalCoins.toLocaleString()}
                        <span className="text-gray-400 text-xs ml-1">({item.purchaseCount}x)</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.purchasers.map((purchaser, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded-full"
                        >
                          @{purchaser.username}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Supporters */}
          {summary.topSupporters.length > 0 && (
            <div className="mb-6 backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Top Supporters
              </h3>
              <div className="space-y-2">
                {summary.topSupporters.map((supporter, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold" style={{ color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }}>
                        #{index + 1}
                      </span>
                      <span className="font-semibold text-white">{supporter.username}</span>
                    </div>
                    <span className="text-cyan-400 font-bold flex items-center gap-1">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      {supporter.totalCoins}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={onClose}
              shimmer
              glow
              className="w-full !text-white font-semibold"
            >
              Back to Dashboard
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  );
}
