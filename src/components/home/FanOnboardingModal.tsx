'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { GlassModal } from '@/components/ui/GlassModal';
import { useToastContext } from '@/context/ToastContext';
import {
  Compass, Heart, Coins, ArrowRight,
  CheckCircle, BadgeCheck, Sparkles,
} from 'lucide-react';

const ONBOARDING_KEY = 'digis_fan_onboarded';

interface SuggestedCreator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isCreatorVerified: boolean;
  primaryCategory?: string | null;
}

interface FanOnboardingModalProps {
  suggestedCreators: SuggestedCreator[];
  userId: string;
}

export function FanOnboardingModal({ suggestedCreators, userId }: FanOnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [followingInProgress, setFollowingInProgress] = useState<string | null>(null);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const { showSuccess } = useToastContext();

  // Show modal if fan hasn't completed onboarding
  useEffect(() => {
    const onboarded = localStorage.getItem(ONBOARDING_KEY);
    if (!onboarded) {
      // Small delay so dashboard loads first
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleFollow = async (creatorId: string) => {
    if (followingInProgress) return;
    setFollowingInProgress(creatorId);
    try {
      const res = await fetch(`/api/follow/${creatorId}`, { method: 'POST' });
      if (res.ok) {
        setFollowedIds(prev => new Set([...prev, creatorId]));
      }
    } catch {
      // Silently fail
    } finally {
      setFollowingInProgress(null);
    }
  };

  const handleClaimBonus = async () => {
    if (claimingBonus || bonusClaimed) return;
    setClaimingBonus(true);
    try {
      const res = await fetch('/api/wallet/welcome-bonus', { method: 'POST' });
      if (res.ok) {
        setBonusClaimed(true);
        showSuccess('10 free coins added to your wallet!');
      }
    } catch {
      // Silently fail
    } finally {
      setClaimingBonus(false);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOpen(false);
  };

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} size="md" ariaLabel="Welcome to Digis">
      {/* Step indicators */}
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              s === step ? 'w-8 bg-cyan-400' : s < step ? 'w-4 bg-cyan-400/50' : 'w-4 bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Welcome + Follow Creators */}
      {step === 1 && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <Image src="/images/digis-logo-white.png" alt="Digis" width={40} height={14} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Digis!</h2>
          <p className="text-gray-400 mb-6">Follow creators to see their streams, content, and updates in your feed.</p>

          {suggestedCreators.length > 0 && (
            <div className="space-y-3 mb-6 max-h-[280px] overflow-y-auto">
              {suggestedCreators.slice(0, 5).map((creator) => (
                <div
                  key={creator.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <Link href={`/${creator.username}`} onClick={handleClose}>
                    {creator.avatarUrl ? (
                      <Image
                        src={creator.avatarUrl}
                        alt={creator.displayName || creator.username}
                        width={44}
                        height={44}
                        className="w-11 h-11 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {(creator.displayName || creator.username)?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-white font-semibold text-sm truncate">
                        {creator.displayName || creator.username}
                      </span>
                      {creator.isCreatorVerified && (
                        <BadgeCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      )}
                    </div>
                    <span className="text-gray-500 text-xs">@{creator.username}</span>
                  </div>
                  <button
                    onClick={() => handleFollow(creator.id)}
                    disabled={followedIds.has(creator.id) || followingInProgress === creator.id}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      followedIds.has(creator.id)
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90'
                    }`}
                  >
                    {followedIds.has(creator.id) ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Following
                      </span>
                    ) : followingInProgress === creator.id ? (
                      '...'
                    ) : (
                      'Follow'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: How Coins Work */}
      {step === 2 && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <Coins className="w-8 h-8 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Coins Power Everything</h2>
          <p className="text-gray-400 mb-6">Use coins to support creators and unlock exclusive experiences.</p>

          <div className="space-y-3 mb-6 text-left">
            {[
              { icon: Heart, label: 'Send tips', desc: 'Support creators during streams and in DMs' },
              { icon: Sparkles, label: 'Unlock exclusive content', desc: 'Access premium photos and videos' },
              { icon: Compass, label: 'Book video calls', desc: '1-on-1 video and voice calls with creators' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="p-2 rounded-lg bg-cyan-500/10 shrink-0">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-gray-500 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Welcome bonus claim */}
          {!bonusClaimed ? (
            <button
              onClick={handleClaimBonus}
              disabled={claimingBonus}
              className="w-full py-3 mb-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {claimingBonus ? (
                'Claiming...'
              ) : (
                <>
                  <Coins className="w-4 h-4" /> Claim 10 Free Coins
                </>
              )}
            </button>
          ) : (
            <div className="w-full py-3 mb-3 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl font-bold flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> 10 Coins Claimed!
            </div>
          )}

          <button
            onClick={() => setStep(3)}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 3: Explore */}
      {step === 3 && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <Compass className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">You&apos;re All Set!</h2>
          <p className="text-gray-400 mb-6">
            {followedIds.size > 0
              ? `You're following ${followedIds.size} creator${followedIds.size > 1 ? 's' : ''}. Their content will appear in your feed.`
              : 'Explore creators, watch live streams, and discover exclusive content.'}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <Link
              href="/explore"
              onClick={handleComplete}
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all text-center group"
            >
              <Compass className="w-8 h-8 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-white font-semibold text-sm">Explore</p>
              <p className="text-gray-500 text-xs">Find creators</p>
            </Link>
            <Link
              href="/for-you"
              onClick={handleComplete}
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all text-center group"
            >
              <Heart className="w-8 h-8 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-white font-semibold text-sm">For You</p>
              <p className="text-gray-500 text-xs">Browse content</p>
            </Link>
          </div>

          <button
            onClick={handleComplete}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Start Exploring
          </button>
        </div>
      )}
    </GlassModal>
  );
}
