'use client';

import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Toast } from '@/components/ui/Toast';
import { CreatorOnboardingModal } from '@/components/creator/CreatorOnboardingModal';
import { SuccessCoachButton } from '@/components/creator/SuccessCoach';
import { useCreatorDashboard } from '@/hooks/useCreatorDashboard';
import {
  DashboardChecklist,
  DashboardEarnings,
  DashboardActivity,
} from '@/components/creator-dashboard';
import {
  Radio, Upload, Calendar, Ticket, Package, AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CreatorDashboard() {
  const router = useRouter();
  const d = useCreatorDashboard();

  if (d.loading) {
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

      {d.toast && (
        <Toast
          message={d.toast.message}
          type={d.toast.type}
          onClose={d.hideToast}
        />
      )}

      <CreatorOnboardingModal
        isOpen={d.showOnboardingModal}
        onClose={() => d.setShowOnboardingModal(false)}
        onComplete={d.handleOnboardingComplete}
        currentProfile={d.userProfile ? {
          username: d.userProfile.username,
          displayName: d.userProfile.displayName,
          bio: d.userProfile.bio,
          avatarUrl: d.userProfile.avatarUrl,
        } : undefined}
      />

      <div className="container mx-auto">
        <div className="px-4 pt-2 md:pt-10 pb-24 md:pb-10 max-w-6xl mx-auto">

          <h1 className="text-2xl font-bold text-white mb-4">Dashboard</h1>

          {/* Pending Orders Hero Card */}
          {d.pendingOrders.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-2 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-500/30 animate-pulse">
                    <Package className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {d.pendingOrders.length} Pending Order{d.pendingOrders.length > 1 ? 's' : ''}
                    </h3>
                    <p className="text-sm text-orange-300">Action required - fulfill to receive payment</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {d.pendingOrders.slice(0, 3).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-black/30 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{order.title.replace('📦 Order: ', '')}</p>
                      <p className="text-xs text-gray-400">{order.description}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-bold text-orange-400">{order.amount} coins</span>
                      <button
                        onClick={() => order.action && d.handleFulfillOrder(order.action.orderId)}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        Fulfill
                      </button>
                    </div>
                  </div>
                ))}
                {d.pendingOrders.length > 3 && (
                  <button
                    onClick={() => router.push('/creator/orders')}
                    className="w-full py-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    View all {d.pendingOrders.length} orders →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Pending Verification Banner */}
          {d.userProfile && d.userProfile.role === 'creator' && d.userProfile.isCreatorVerified === false && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-yellow-500/20">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-400">Pending Verification</h3>
                  <p className="text-xs text-gray-400">
                    Your creator account is under review. You can still set up your profile while we verify your account.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Getting Started Checklist */}
          <DashboardChecklist
            userProfile={d.userProfile}
            dismissedChecklist={d.dismissedChecklist}
            onDismiss={() => {
              d.setDismissedChecklist(true);
              localStorage.setItem('creator_checklist_dismissed', 'true');
            }}
          />

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => router.push('/creator/go-live')}
              className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30 hover:border-red-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Radio className="w-6 h-6 text-red-400" />
              <span className="text-lg font-semibold text-white">Go Live</span>
            </button>
            <button
              onClick={() => router.push('/creator/content/new')}
              className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 hover:border-cyan-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Upload className="w-6 h-6 text-cyan-400" />
              <span className="text-lg font-semibold text-white">New Post</span>
            </button>
          </div>

          {/* Earnings Summary */}
          <DashboardEarnings
            monthlyEarnings={d.monthlyEarnings}
            followerCount={d.followerCount}
            subscriberCount={d.subscriberCount}
            earningsChange={d.earningsChange}
            selectedPeriod={d.selectedPeriod}
            showPeriodDropdown={d.showPeriodDropdown}
            setShowPeriodDropdown={d.setShowPeriodDropdown}
            onPeriodChange={d.handlePeriodChange}
            getPeriodLabel={d.getPeriodLabel}
          />

          {/* Upcoming Events */}
          {d.upcomingEvents.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-purple-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Upcoming</h3>
              </div>
              <div className="space-y-2">
                {d.upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => {
                      if (event.type === 'show') {
                        router.push(`/streams/${event.id.replace('show-', '')}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Ticket className="w-4 h-4 text-purple-400" />
                      <div>
                        <p className="text-sm font-medium text-white">{event.title}</p>
                        <p className="text-xs text-gray-400">{event.details}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(event.scheduledFor), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity + Content Grid */}
          <DashboardActivity
            recentActivities={d.recentActivities}
            recentContent={d.recentContent}
            onFulfillOrder={d.handleFulfillOrder}
          />

        </div>
      </div>

      {/* Creator Success Coach */}
      {d.userProfile?.id && (
        <SuccessCoachButton creatorId={d.userProfile.id} />
      )}
    </div>
  );
}
