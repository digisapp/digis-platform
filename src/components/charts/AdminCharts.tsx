'use client';

import { memo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { GlassCard } from '@/components/ui';
import { BarChart3 } from 'lucide-react';

interface Analytics {
  signupsTimeline: Array<{ date: string; signups: number }>;
  roleDistribution: { fan: number; creator: number; admin: number };
  applicationStats: { pending: number; approved: number; rejected: number };
  contentTypes: Array<{ type: string; count: number }>;
}

interface AdminChartsProps {
  analytics: Analytics;
}

const COLORS = ['#06b6d4', '#ec4899', '#8b5cf6'];

export default memo(function AdminCharts({ analytics }: AdminChartsProps) {
  return (
    <div className="space-y-6">
      {/* User Signups Timeline */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-digis-cyan" />
          User Signups (Last 30 Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.signupsTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#f3f4f6' }}
            />
            <Line type="monotone" dataKey="signups" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4' }} />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Role Distribution */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold mb-4">User Role Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Fans', value: analytics.roleDistribution.fan },
                  { name: 'Creators', value: analytics.roleDistribution.creator },
                  { name: 'Admins', value: analytics.roleDistribution.admin },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[0, 1, 2].map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Application Status */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold mb-4">Application Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { status: 'Pending', count: analytics.applicationStats.pending },
              { status: 'Approved', count: analytics.applicationStats.approved },
              { status: 'Rejected', count: analytics.applicationStats.rejected },
            ]}>
              <XAxis dataKey="status" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
              <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Content Types */}
      {analytics.contentTypes && analytics.contentTypes.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold mb-4">Popular Content Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.contentTypes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="type" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
              <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Bar dataKey="count" fill="#ec4899" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}
    </div>
  );
})
