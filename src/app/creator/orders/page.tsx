'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';
import { Package, Check, Clock, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Order {
  id: string;
  itemLabel: string;
  itemEmoji: string | null;
  price: number;
  status: string;
  createdAt: string;
  fulfilledAt: string | null;
  fulfillmentNote: string | null;
  buyer: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

export default function CreatorOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'fulfilled' | 'all'>('pending');
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const status = filter === 'all' ? '' : filter;
      const res = await fetch(`/api/creator/orders${status ? `?status=${status}` : ''}`);
      if (!res.ok) {
        if (res.status === 403) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch orders');
      }
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      setToast({ message: 'Failed to load orders', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleFulfill = async (orderId: string) => {
    setFulfillingId(orderId);
    try {
      const res = await fetch(`/api/creator/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Failed to fulfill order');
      setToast({ message: 'Order fulfilled!', type: 'success' });
      fetchOrders();
    } catch {
      setToast({ message: 'Failed to fulfill order', type: 'error' });
    } finally {
      setFulfillingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <MobileHeader />
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/creator/dashboard')}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Tip Menu Orders</h1>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'fulfilled', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setLoading(true); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No {filter !== 'all' ? filter : ''} orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{order.itemEmoji || '📦'}</span>
                      <span className="font-medium text-white truncate">{order.itemLabel}</span>
                      <span className="text-orange-400 text-sm font-medium">{order.price} coins</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      From {order.buyer?.displayName || order.buyer?.username || 'Unknown'}{' '}
                      &middot; {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </p>
                    {order.fulfillmentNote && (
                      <p className="text-sm text-gray-500 mt-1">Note: {order.fulfillmentNote}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {order.status === 'pending' ? (
                      <button
                        onClick={() => handleFulfill(order.id)}
                        disabled={fulfillingId === order.id}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        {fulfillingId === order.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Fulfill
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-green-400">
                        <Clock className="w-4 h-4" />
                        Fulfilled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
