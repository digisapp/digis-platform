'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CloudItem {
  id: string;
  creatorId: string;
  fileUrl: string;
  previewUrl: string | null;
  thumbnailUrl: string | null;
  type: 'photo' | 'video';
  durationSeconds: number | null;
  sizeBytes: number | null;
  status: 'private' | 'live';
  priceCoins: number | null;
  uploadedAt: string;
  publishedAt: string | null;
}

export interface CloudPack {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  priceCoins: number;
  status: 'draft' | 'live';
  itemCount: number;
  purchaseCount: number;
  totalEarnings: number;
  createdAt: string;
  items?: { item: CloudItem; sortOrder: number }[];
}

export interface CloudTag {
  id: string;
  name: string;
  itemCount: number;
}

type StatusFilter = 'private' | 'live';

export function useCloudData() {
  const [items, setItems] = useState<CloudItem[]>([]);
  const [total, setTotal] = useState(0);
  const [packs, setPacks] = useState<CloudPack[]>([]);
  const [tags, setTags] = useState<CloudTag[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('private');
  const [typeFilter, setTypeFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // ── Fetch items ──
  const fetchItems = useCallback(async (p = page) => {
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' });
      params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (tagFilter) params.set('tag', tagFilter);

      const res = await fetch(`/api/cloud/items?${params}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('[useCloudData] fetchItems error:', err);
    }
  }, [statusFilter, typeFilter, tagFilter, page]);

  // ── Fetch packs ──
  const fetchPacks = useCallback(async () => {
    try {
      const res = await fetch('/api/cloud/packs');
      const data = await res.json();
      if (res.ok) setPacks(data.packs);
    } catch (err) {
      console.error('[useCloudData] fetchPacks error:', err);
    }
  }, []);

  // ── Fetch tags ──
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/cloud/tags');
      const data = await res.json();
      if (res.ok) setTags(data.tags);
    } catch (err) {
      console.error('[useCloudData] fetchTags error:', err);
    }
  }, []);

  // ── Initial load ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchItems(1), fetchPacks(), fetchTags()]);
      setLoading(false);
    };
    load();
  }, []);

  // ── Refetch on filter change ──
  useEffect(() => {
    setPage(1);
    fetchItems(1);
  }, [statusFilter, typeFilter]);

  // ── Upload files ──
  const uploadFiles = useCallback(async (files: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      files.forEach((file, i) => {
        formData.append('files', file);
        // If video, client can provide duration (handled by caller)
      });

      const res = await fetch('/api/cloud/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setUploadProgress(100);

      if (res.ok) {
        await fetchItems(1);
        return { success: true, uploaded: data.uploaded, items: data.items };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Upload failed' };
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [fetchItems]);

  // ── Update single item ──
  const updateItem = useCallback(async (id: string, updates: { priceCoins?: number | null; status?: string }) => {
    try {
      const res = await fetch(`/api/cloud/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok) {
        setItems(prev => prev.map(item => item.id === id ? data.item : item));
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  // ── Delete item ──
  const deleteItem = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/cloud/items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
        setTotal(prev => prev - 1);
        return { success: true };
      }
      const data = await res.json();
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, []);

  // ── Bulk actions ──
  const bulkSetStatus = useCallback(async (itemIds: string[], status: string) => {
    try {
      const res = await fetch('/api/cloud/items/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_status', itemIds, status }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchItems(page);
        setSelectedItems(new Set());
        return { success: true, updated: data.updated };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [fetchItems, page]);

  // ── Bulk set price ──
  const bulkSetPrice = useCallback(async (itemIds: string[], priceCoins: number) => {
    try {
      const res = await fetch('/api/cloud/items/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_price', itemIds, priceCoins }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchItems(page);
        setSelectedItems(new Set());
        return { success: true, updated: data.updated };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [fetchItems, page]);

  // ── Quick Sell ──
  const quickSell = useCallback(async (action: string, itemIds: string[], packTitle?: string, packPrice?: number) => {
    try {
      const res = await fetch('/api/cloud/quick-sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, itemIds, packTitle, packPrice }),
      });
      const data = await res.json();
      if (res.ok) {
        await Promise.all([fetchItems(1), fetchPacks()]);
        setSelectedItems(new Set());
        return { success: true, ...data };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [fetchItems, fetchPacks]);

  // ── Create pack ──
  const createPack = useCallback(async (title: string, priceCoins: number, itemIds: string[]) => {
    try {
      const res = await fetch('/api/cloud/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priceCoins, itemIds }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchPacks();
        setSelectedItems(new Set());
        return { success: true, pack: data.pack };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [fetchPacks]);

  // ── Selection helpers ──
  const toggleSelect = useCallback((id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(items.map(i => i.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // ── Stats ──
  const stats = {
    total,
    private: items.filter(i => i.status === 'private').length,
    live: items.filter(i => i.status === 'live').length,
    unpriced: items.filter(i => !i.priceCoins).length,
    photos: items.filter(i => i.type === 'photo').length,
    videos: items.filter(i => i.type === 'video').length,
  };

  return {
    // Data
    items,
    total,
    packs,
    tags,
    stats,

    // State
    loading,
    uploading,
    uploadProgress,
    statusFilter,
    typeFilter,
    tagFilter,
    page,
    selectedItems,

    // Setters
    setStatusFilter,
    setTypeFilter,
    setTagFilter,
    setPage,

    // Actions
    uploadFiles,
    updateItem,
    deleteItem,
    bulkSetStatus,
    bulkSetPrice,
    quickSell,
    createPack,
    fetchItems,
    fetchPacks,
    fetchTags,

    // Selection
    toggleSelect,
    selectAll,
    clearSelection,
  };
}
