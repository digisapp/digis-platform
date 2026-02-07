'use client';

import { useState, useMemo, useCallback } from 'react';

export interface SettingsFormState {
  displayName: string;
  bio: string;
  city: string;
  state: string;
  phoneNumber: string;
  avatarUrl: string;
  bannerUrl: string;
  primaryCategory: string;
  secondaryCategory: string;
  email: string;
  instagramHandle: string;
  tiktokHandle: string;
  twitterHandle: string;
  snapchatHandle: string;
  youtubeHandle: string;
  twitchHandle: string;
  amazonHandle: string;
  contactEmail: string;
  showSocialLinks: boolean;
}

const EMPTY_FORM: SettingsFormState = {
  displayName: '',
  bio: '',
  city: '',
  state: '',
  phoneNumber: '',
  avatarUrl: '',
  bannerUrl: '',
  primaryCategory: '',
  secondaryCategory: '',
  email: '',
  instagramHandle: '',
  tiktokHandle: '',
  twitterHandle: '',
  snapchatHandle: '',
  youtubeHandle: '',
  twitchHandle: '',
  amazonHandle: '',
  contactEmail: '',
  showSocialLinks: true,
};

/**
 * Manages the settings form state as a single object instead of 20+ individual useState calls.
 * Provides change detection to warn about unsaved changes.
 */
export function useSettingsForm() {
  const [form, setForm] = useState<SettingsFormState>({ ...EMPTY_FORM });
  const [initialForm, setInitialForm] = useState<SettingsFormState | null>(null);

  // Update a single field
  const setField = useCallback(<K extends keyof SettingsFormState>(key: K, value: SettingsFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  // Bulk-set all fields from API data
  const populateFromApi = useCallback((data: any) => {
    const populated: SettingsFormState = {
      displayName: data.displayName || '',
      bio: data.bio || '',
      city: data.profile?.city || '',
      state: data.profile?.state || '',
      phoneNumber: data.profile?.phoneNumber || '',
      avatarUrl: data.avatarUrl || '',
      bannerUrl: data.bannerUrl || '',
      primaryCategory: data.primaryCategory || '',
      secondaryCategory: data.secondaryCategory || '',
      email: data.email || '',
      instagramHandle: data.profile?.instagramHandle || '',
      tiktokHandle: data.profile?.tiktokHandle || '',
      twitterHandle: data.profile?.twitterHandle || '',
      snapchatHandle: data.profile?.snapchatHandle || '',
      youtubeHandle: data.profile?.youtubeHandle || '',
      twitchHandle: data.profile?.twitchHandle || '',
      amazonHandle: data.profile?.amazonHandle || '',
      contactEmail: data.profile?.contactEmail || '',
      showSocialLinks: data.profile?.showSocialLinks ?? true,
    };
    setForm(populated);
    setInitialForm({ ...populated });
  }, []);

  // Reset form to initial state after save
  const markAsSaved = useCallback(() => {
    setInitialForm({ ...form });
  }, [form]);

  // Detect unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!initialForm) return false;
    return (Object.keys(EMPTY_FORM) as Array<keyof SettingsFormState>).some(
      key => form[key] !== initialForm[key]
    );
  }, [form, initialForm]);

  return {
    form,
    setField,
    populateFromApi,
    markAsSaved,
    hasUnsavedChanges,
  };
}
