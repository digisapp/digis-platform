'use client';

import { useEffect, useState, useCallback } from 'react';
import type { CreatorLink } from '@/components/settings/types';

interface UseCreatorLinksParams {
  userRole: string | undefined;
  setMessage: (msg: string) => void;
  setError: (err: string) => void;
}

export function useCreatorLinks({ userRole, setMessage, setError }: UseCreatorLinksParams) {
  const [creatorLinks, setCreatorLinks] = useState<CreatorLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksSaving, setLinksSaving] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingLink, setEditingLink] = useState<CreatorLink | null>(null);
  const [linkFormData, setLinkFormData] = useState({ title: '', url: '', emoji: '' });

  const fetchCreatorLinks = useCallback(async () => {
    setLinksLoading(true);
    try {
      const response = await fetch('/api/creator/links');
      if (response.ok) {
        const data = await response.json();
        setCreatorLinks(data.links || []);
      }
    } catch (err) {
      console.error('Error fetching creator links:', err);
    } finally {
      setLinksLoading(false);
    }
  }, []);

  // Fetch links when role is creator
  useEffect(() => {
    if (userRole === 'creator') {
      fetchCreatorLinks();
    }
  }, [userRole, fetchCreatorLinks]);

  const handleOpenLinkModal = useCallback((link?: CreatorLink) => {
    if (link) {
      setEditingLink(link);
      setLinkFormData({
        title: link.title,
        url: link.url,
        emoji: link.emoji || '',
      });
    } else {
      setEditingLink(null);
      setLinkFormData({ title: '', url: '', emoji: '' });
    }
    setShowLinkModal(true);
  }, []);

  const handleCloseLinkModal = useCallback(() => {
    setShowLinkModal(false);
    setEditingLink(null);
    setLinkFormData({ title: '', url: '', emoji: '' });
  }, []);

  const handleSaveLink = useCallback(async () => {
    if (!linkFormData.title.trim() || !linkFormData.url.trim()) {
      setError('Title and URL are required');
      return;
    }

    try {
      new URL(linkFormData.url);
    } catch {
      setError('Please enter a valid URL (include https://)');
      return;
    }

    setLinksSaving(true);
    try {
      const url = editingLink
        ? `/api/creator/links/${editingLink.id}`
        : '/api/creator/links';
      const method = editingLink ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: linkFormData.title.trim(),
          url: linkFormData.url.trim(),
          emoji: linkFormData.emoji || null,
        }),
      });

      if (response.ok) {
        setMessage(editingLink ? 'Link updated!' : 'Link added!');
        setTimeout(() => setMessage(''), 3000);
        handleCloseLinkModal();
        fetchCreatorLinks();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save link');
      }
    } catch (err) {
      setError('Failed to save link');
    } finally {
      setLinksSaving(false);
    }
  }, [linkFormData, editingLink, setError, setMessage, handleCloseLinkModal, fetchCreatorLinks]);

  const handleDeleteLink = useCallback(async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const response = await fetch(`/api/creator/links/${linkId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('Link deleted');
        setTimeout(() => setMessage(''), 3000);
        setCreatorLinks(prev => prev.filter(l => l.id !== linkId));
      } else {
        setError('Failed to delete link');
      }
    } catch (err) {
      setError('Failed to delete link');
    }
  }, [setMessage, setError]);

  const handleToggleLinkActive = useCallback(async (link: CreatorLink) => {
    try {
      const response = await fetch(`/api/creator/links/${link.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !link.isActive }),
      });

      if (response.ok) {
        setCreatorLinks(prev => prev.map(l =>
          l.id === link.id ? { ...l, isActive: !l.isActive } : l
        ));
      }
    } catch (err) {
      setError('Failed to update link');
    }
  }, [setError]);

  const moveLink = useCallback(async (index: number, direction: 'up' | 'down') => {
    setCreatorLinks(prev => {
      const newLinks = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= newLinks.length) return prev;

      [newLinks[index], newLinks[newIndex]] = [newLinks[newIndex], newLinks[index]];

      // Save new order
      fetch('/api/creator/links/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkIds: newLinks.map(l => l.id) }),
      }).catch(err => console.error('Failed to save order:', err));

      return newLinks;
    });
  }, []);

  return {
    creatorLinks,
    linksLoading,
    linksSaving,
    showLinkModal,
    editingLink,
    linkFormData,
    setLinkFormData,
    handleOpenLinkModal,
    handleCloseLinkModal,
    handleSaveLink,
    handleDeleteLink,
    handleToggleLinkActive,
    moveLink,
  };
}
