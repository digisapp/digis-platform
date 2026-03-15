'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type UploadStatus =
  | 'local_queued'
  | 'uploading'
  | 'uploaded'
  | 'registering'
  | 'processing'
  | 'ready'
  | 'failed';

export interface QueueItem {
  id: string;                  // Local unique ID
  file: File | null;           // Null after page refresh (file ref lost)
  fileName: string;
  fileSize: number;
  contentType: string;
  type: 'photo' | 'video';
  durationSeconds: number | null;
  status: UploadStatus;
  progress: number;            // 0-100
  storagePath: string | null;
  signedUrl: string | null;
  itemId: string | null;       // Cloud item ID after registration
  error: string | null;
  addedAt: number;
}

interface PersistedQueueItem {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  type: 'photo' | 'video';
  durationSeconds: number | null;
  status: UploadStatus;
  storagePath: string | null;
  itemId: string | null;
  error: string | null;
  addedAt: number;
}

const STORAGE_KEY = 'digis_upload_queue';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function persistQueue(items: QueueItem[]) {
  try {
    const serializable: PersistedQueueItem[] = items
      .filter(i => i.status !== 'ready') // Don't persist completed items
      .map(({ file, progress, signedUrl, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {}
}

function loadPersistedQueue(): QueueItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed: PersistedQueueItem[] = JSON.parse(data);
    return parsed.map(item => ({
      ...item,
      file: null, // File ref is lost after refresh
      progress: 0,
      signedUrl: null,
      // If it was uploading when the page died, mark as failed (needs re-add)
      status: item.status === 'uploading' || item.status === 'local_queued'
        ? 'failed' as UploadStatus
        : item.status,
      error: item.status === 'uploading' || item.status === 'local_queued'
        ? 'Upload interrupted — re-add this file'
        : item.error,
    }));
  } catch {
    return [];
  }
}

export function useUploadQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);

  // Keep ref in sync
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Load persisted queue on mount
  useEffect(() => {
    const persisted = loadPersistedQueue();
    if (persisted.length > 0) {
      setQueue(persisted);
    }
  }, []);

  // Persist queue on changes
  useEffect(() => {
    if (queue.length > 0) {
      persistQueue(queue);
    }
  }, [queue]);

  const updateItem = useCallback((id: string, updates: Partial<QueueItem>) => {
    setQueue(prev => {
      const next = prev.map(item =>
        item.id === id ? { ...item, ...updates } : item
      );
      return next;
    });
  }, []);

  // Add files to the queue
  const addFiles = useCallback((files: File[], durations?: Map<string, number>) => {
    const newItems: QueueItem[] = files.map(file => {
      const isImage = file.type.startsWith('image/');
      return {
        id: generateId(),
        file,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        type: (isImage ? 'photo' : 'video') as 'photo' | 'video',
        durationSeconds: durations?.get(file.name) ?? null,
        status: 'local_queued' as UploadStatus,
        progress: 0,
        storagePath: null,
        signedUrl: null,
        itemId: null,
        error: null,
        addedAt: Date.now(),
      };
    });

    setQueue(prev => [...prev, ...newItems]);
  }, []);

  // Process the queue — uploads one file at a time
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    try {
      while (true) {
        const current = queueRef.current;
        const next = current.find(i => i.status === 'local_queued' && i.file);
        if (!next) break;

        // Step 1: Get signed upload URL
        updateItem(next.id, { status: 'uploading', progress: 0 });

        try {
          const signRes = await fetch('/api/cloud/upload/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentType: next.contentType,
              sizeBytes: next.fileSize,
            }),
          });

          const signData = await signRes.json();
          if (!signRes.ok) {
            updateItem(next.id, {
              status: 'failed',
              error: signData.error || 'Failed to get upload URL',
            });
            continue;
          }

          const { signedUrl, storagePath, token } = signData;
          updateItem(next.id, { storagePath, signedUrl });

          // Step 2: Upload file directly to Supabase Storage
          const uploadRes = await uploadWithProgress(
            signedUrl,
            next.file!,
            next.contentType,
            token,
            (progress) => {
              updateItem(next.id, { progress });
            }
          );

          if (!uploadRes.ok) {
            updateItem(next.id, {
              status: 'failed',
              error: uploadRes.error || 'Upload to storage failed',
            });
            continue;
          }

          updateItem(next.id, { status: 'uploaded', progress: 100 });

          // Step 3: Register item in database
          updateItem(next.id, { status: 'registering' });

          const regRes = await fetch('/api/cloud/upload/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storagePath,
              type: next.type,
              sizeBytes: next.fileSize,
              durationSeconds: next.durationSeconds,
            }),
          });

          const regData = await regRes.json();
          if (!regRes.ok) {
            updateItem(next.id, {
              status: 'failed',
              error: regData.error || 'Failed to register item',
            });
            continue;
          }

          updateItem(next.id, {
            status: regData.processingStatus === 'done' ? 'ready' : 'processing',
            itemId: regData.item.id,
            progress: 100,
          });

          // Auto-remove completed items after 2s so the queue stays clean
          const autoRemoveDelay = regData.processingStatus === 'done' ? 2000 : 5000;
          setTimeout(() => {
            setQueue(prev => {
              const filtered = prev.filter(i => i.id !== next.id);
              if (filtered.length === 0) localStorage.removeItem(STORAGE_KEY);
              return filtered;
            });
          }, autoRemoveDelay);
        } catch (err: any) {
          updateItem(next.id, {
            status: 'failed',
            error: err.message || 'Upload failed',
          });
        }
      }
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [updateItem]);

  // Start processing whenever new items are added
  useEffect(() => {
    const hasQueued = queue.some(i => i.status === 'local_queued' && i.file);
    if (hasQueued && !processingRef.current) {
      processQueue();
    }
  }, [queue, processQueue]);

  // Remove an item from the queue
  const removeItem = useCallback((id: string) => {
    setQueue(prev => {
      const next = prev.filter(i => i.id !== id);
      if (next.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      }
      return next;
    });
  }, []);

  // Retry a failed item (only works if file ref still exists)
  const retryItem = useCallback((id: string) => {
    setQueue(prev =>
      prev.map(item =>
        item.id === id && item.status === 'failed' && item.file
          ? { ...item, status: 'local_queued' as UploadStatus, error: null, progress: 0 }
          : item
      )
    );
  }, []);

  // Clear completed items
  const clearCompleted = useCallback(() => {
    setQueue(prev => {
      const next = prev.filter(i => i.status !== 'ready');
      if (next.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      }
      return next;
    });
  }, []);

  // Clear all items
  const clearAll = useCallback(() => {
    setQueue([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const stats = {
    total: queue.length,
    queued: queue.filter(i => i.status === 'local_queued').length,
    uploading: queue.filter(i => i.status === 'uploading').length,
    completed: queue.filter(i => i.status === 'ready').length,
    failed: queue.filter(i => i.status === 'failed').length,
    processing: queue.filter(i => ['uploaded', 'registering', 'processing'].includes(i.status)).length,
  };

  return {
    queue,
    isProcessing,
    stats,
    addFiles,
    removeItem,
    retryItem,
    clearCompleted,
    clearAll,
  };
}

/**
 * Upload a file via PUT with XHR for progress tracking
 */
function uploadWithProgress(
  signedUrl: string,
  file: File,
  contentType: string,
  token: string,
  onProgress: (pct: number) => void,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true });
      } else {
        let error = `Storage error ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body.error || body.message) error = body.error || body.message;
        } catch {}
        resolve({ ok: false, error });
      }
    });

    xhr.addEventListener('error', () => {
      resolve({ ok: false, error: 'Network error — check your connection' });
    });

    xhr.addEventListener('abort', () => {
      resolve({ ok: false, error: 'Upload cancelled' });
    });

    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.send(file);
  });
}
