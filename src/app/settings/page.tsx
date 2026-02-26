'use client';

import { useAuth } from '@/context/AuthContext';
import { GlassButton, LoadingSpinner, ResponsiveSettingsLayout, ImageCropper } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { CheckCircle, AlertCircle, User, Share2, Settings, DollarSign, Circle, Bot } from 'lucide-react';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import { useSettingsData } from '@/hooks/useSettingsData';
import { useCreatorLinks } from '@/hooks/useCreatorLinks';
import { ProfileSection, SocialSection, RatesSection, AiTwinSection, ActionsSection, LinkModal } from '@/components/settings';
import { ShareDigisCard } from '@/components/share/ShareDigisCard';

export default function SettingsPage() {
  const { signOut } = useAuth();

  const { form, setField, populateFromApi, markAsSaved, hasUnsavedChanges } = useSettingsForm();

  const settingsData = useSettingsData({ form, setField, populateFromApi, markAsSaved });
  const {
    currentUser, loading, message, error, lastSaved, saving,
    avatarPreview, bannerPreview, uploadingAvatar, uploadingBanner,
    showAvatarCropper, avatarToCrop,
    newUsername, setNewUsername, usernameStatus, usernameError, usernameCooldown,
    savingUsername,
    handleSaveProfile, handleChangeUsername,
    handleAvatarUpload, handleAvatarCropComplete, handleAvatarCropCancel, handleBannerUpload,
    setMessage, setError,
  } = settingsData;

  const linksData = useCreatorLinks({
    userRole: currentUser?.role,
    setMessage,
    setError,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const sections = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      content: (
        <ProfileSection
          currentUser={currentUser}
          form={form}
          setField={setField}
          avatarPreview={avatarPreview}
          bannerPreview={bannerPreview}
          uploadingAvatar={uploadingAvatar}
          uploadingBanner={uploadingBanner}
          handleAvatarUpload={handleAvatarUpload}
          handleBannerUpload={handleBannerUpload}
          newUsername={newUsername}
          setNewUsername={setNewUsername}
          usernameStatus={usernameStatus}
          usernameError={usernameError}
          usernameCooldown={usernameCooldown}
          savingUsername={savingUsername}
          handleChangeUsername={handleChangeUsername}
        />
      ),
    },
    ...(currentUser?.role === 'creator' ? [{
      id: 'rates',
      label: 'Rates',
      icon: DollarSign,
      content: <RatesSection />,
    }] : []),
    ...(currentUser?.role === 'creator' ? [{
      id: 'ai-twin',
      label: 'AI Twin',
      icon: Bot,
      content: <AiTwinSection />,
    }] : []),
    {
      id: 'social',
      label: 'Social',
      icon: Share2,
      content: (
        <>
          <SocialSection
            currentUser={currentUser}
            form={form}
            setField={setField}
            creatorLinks={linksData.creatorLinks}
            linksLoading={linksData.linksLoading}
            handleOpenLinkModal={linksData.handleOpenLinkModal}
            handleDeleteLink={linksData.handleDeleteLink}
            handleToggleLinkActive={linksData.handleToggleLinkActive}
            moveLink={linksData.moveLink}
          />
          {/* Share Your Digis QR - only for creators */}
          {currentUser?.role === 'creator' && (
            <div className="pt-6 mt-6 border-t border-cyan-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="w-5 h-5 text-digis-cyan" />
                <h3 className="text-lg font-semibold text-white">Share Your Digis</h3>
              </div>
              <ShareDigisCard
                username={currentUser.username || ''}
                displayName={currentUser.displayName || undefined}
                profileImage={currentUser.avatarUrl}
                bio={currentUser.bio}
              />
            </div>
          )}
        </>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      icon: Settings,
      content: <ActionsSection currentUser={currentUser} signOut={signOut} />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 pt-4 md:py-12 px-4 pb-24 md:pb-8 relative overflow-hidden">
      <MobileHeader />
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      {/* Animated background effects - hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        {/* Page Header with Save State Indicator */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? (
              <span className="text-yellow-400 text-sm flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <Circle className="w-2 h-2 fill-current" />
                Unsaved changes
              </span>
            ) : lastSaved ? (
              <span className="text-green-400 text-sm flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
                <CheckCircle className="w-3 h-3" />
                Saved
              </span>
            ) : null}
          </div>
        </div>

        {/* Global Messages */}
        {message && (
          <div className="glass p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500 text-green-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300" aria-live="polite">
            <div className="p-2 bg-green-500 rounded-lg">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium">{message}</span>
          </div>
        )}

        {error && (
          <div className="glass p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-pink-500/10 border-2 border-red-500 text-red-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300" aria-live="polite">
            <div className="p-2 bg-red-500 rounded-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Responsive Settings Layout */}
        <form onSubmit={handleSaveProfile}>
          <ResponsiveSettingsLayout sections={sections} defaultSection="profile" />

          <div className="mt-6">
            <GlassButton
              type="submit"
              variant="gradient"
              disabled={saving}
              className="w-full md:w-auto"
            >
              {saving ? <LoadingSpinner size="sm" /> : 'Save Profile'}
            </GlassButton>
          </div>
        </form>

      </div>

      {/* Link Modal */}
      <LinkModal
        isOpen={linksData.showLinkModal}
        onClose={linksData.handleCloseLinkModal}
        editingLink={linksData.editingLink}
        linkFormData={linksData.linkFormData}
        setLinkFormData={linksData.setLinkFormData}
        onSave={linksData.handleSaveLink}
        saving={linksData.linksSaving}
      />

      {/* Avatar Cropper Modal */}
      {showAvatarCropper && avatarToCrop && (
        <ImageCropper
          image={avatarToCrop}
          onCropComplete={handleAvatarCropComplete}
          onCancel={handleAvatarCropCancel}
          cropShape="round"
          aspectRatio={1}
          title="Adjust Profile Photo"
        />
      )}
    </div>
  );
}
