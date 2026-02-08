'use client';

import { useRouter } from 'next/navigation';
import {
  Gift, UserPlus, PhoneCall, Video, Clock, Coins, Heart,
  TrendingUp, Eye, Play, Image as ImageIcon, MessageCircle, Package,
} from 'lucide-react';
import { MediaThumbnail } from '@/components/ui/MediaThumbnail';
import { formatDistanceToNow } from 'date-fns';
import type { Activity, ContentItem } from './types';

interface DashboardActivityProps {
  recentActivities: Activity[];
  recentContent: ContentItem[];
  onFulfillOrder: (orderId: string) => void;
}

const getActivityIcon = (iconType: string) => {
  switch (iconType) {
    case 'gift': return <Gift className="w-4 h-4" />;
    case 'userplus': return <UserPlus className="w-4 h-4" />;
    case 'phone': return <PhoneCall className="w-4 h-4" />;
    case 'video': return <Video className="w-4 h-4" />;
    case 'coins': return <Coins className="w-4 h-4" />;
    case 'heart': return <Heart className="w-4 h-4" />;
    case 'package': return <Package className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

const getContentIcon = (type: string) => {
  switch (type) {
    case 'video': return <Play className="w-4 h-4" />;
    default: return <ImageIcon className="w-4 h-4" />;
  }
};

export function DashboardActivity({ recentActivities, recentContent, onFulfillOrder }: DashboardActivityProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Activity */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-400" />
            Recent Activity
          </h3>
        </div>

        {recentActivities.length > 0 ? (
          <div className="space-y-2">
            {recentActivities.slice(0, 8).map((activity) => (
              <div
                key={activity.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${activity.action ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-white/5'}`}
              >
                <div className={`p-2 rounded-lg bg-white/10 ${activity.color}`}>
                  {getActivityIcon(activity.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{activity.title}</p>
                  <p className="text-xs text-gray-400 truncate">{activity.description}</p>
                </div>
                {activity.action ? (
                  <button
                    onClick={() => onFulfillOrder(activity.action!.orderId)}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    {activity.action.label}
                  </button>
                ) : (
                  <p className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <TrendingUp className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400">No activity yet</p>
            <p className="text-sm text-gray-500">Gifts, follows, and subscriptions will appear here</p>
          </div>
        )}
      </div>

      {/* Content Performance */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-400" />
            Your Content
          </h3>
          <button
            onClick={() => router.push('/creator/content')}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            View All
          </button>
        </div>

        {recentContent.length > 0 ? (
          <div className="space-y-2">
            {recentContent.map((content) => (
              <div
                key={content.id}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => router.push(`/content/${content.id}`)}
              >
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden relative">
                  {content.thumbnailUrl ? (
                    <MediaThumbnail
                      src={content.thumbnailUrl}
                      alt={content.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    getContentIcon(content.type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{content.title}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {content.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {content.likeCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {content.commentCount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <ImageIcon className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400">No content yet</p>
            <button
              onClick={() => router.push('/creator/content/new')}
              className="mt-2 text-sm text-cyan-400 hover:text-cyan-300"
            >
              Create your first post
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
