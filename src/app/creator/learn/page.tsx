'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/layout/MobileHeader';
import {
  GraduationCap, Video, Target, BarChart2, Clock, Mic, DollarSign,
  MessageSquare, Sparkles, Gift, Users, Ticket, Radio, Camera,
  ChevronDown, ChevronUp, Play, CheckCircle, Star, Zap, Phone,
  Upload, Image, Lock, Coins
} from 'lucide-react';

interface FeatureGuide {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  tips: string[];
  steps?: string[];
}

const featureGuides: FeatureGuide[] = [
  {
    id: 'go-live',
    title: 'Going Live',
    icon: <Radio className="w-6 h-6" />,
    color: 'text-red-400',
    description: 'Start streaming to connect with your fans in real-time. Choose portrait mode for mobile viewers or landscape for desktop.',
    tips: [
      'Use portrait mode for a more intimate, phone-friendly experience',
      'Landscape mode works great for gaming or desktop content',
      'Ensure good lighting - face a window or use a ring light',
      'Test your audio before going live',
      'Use the Remote Control feature to manage your stream from your phone'
    ],
    steps: [
      'Tap "Go Live" from your profile menu',
      'Enter a catchy stream title',
      'Choose portrait or landscape orientation',
      'Allow camera and microphone permissions',
      'Tap "Start Stream" when ready'
    ]
  },
  {
    id: 'goals',
    title: 'Stream Goals',
    icon: <Target className="w-6 h-6" />,
    color: 'text-green-400',
    description: 'Set goals during your stream to motivate fans to tip. When a goal is reached, everyone celebrates!',
    tips: [
      'Set achievable but exciting goals',
      'Offer fun rewards like dances, shoutouts, or challenges',
      'Update your goal regularly to keep engagement high',
      'Thank contributors when goals are reached'
    ],
    steps: [
      'During a live stream, tap the Goal icon',
      'Enter a target amount in coins',
      'Add a description of the reward',
      'Watch contributions come in!'
    ]
  },
  {
    id: 'polls',
    title: 'Live Polls',
    icon: <BarChart2 className="w-6 h-6" />,
    color: 'text-purple-400',
    description: 'Create polls to let your audience vote and participate in your stream decisions.',
    tips: [
      'Use polls to decide what to do next',
      'Keep options fun and engaging',
      'React to poll results live for more interaction',
      'Polls appear as overlays for all viewers'
    ],
    steps: [
      'Tap the Poll icon during your stream',
      'Enter your question',
      'Add 2-4 answer options',
      'Set the duration and start!'
    ]
  },
  {
    id: 'timers',
    title: 'Countdown Timers',
    icon: <Clock className="w-6 h-6" />,
    color: 'text-cyan-400',
    description: 'Create countdowns to build anticipation for special moments in your stream.',
    tips: [
      'Use timers for giveaways and reveals',
      'Build hype for special performances',
      'Great for time-limited challenges'
    ],
    steps: [
      'Tap the Timer icon during your stream',
      'Enter a label (e.g., "Giveaway in...")',
      'Set the duration',
      'Everyone sees the countdown!'
    ]
  },
  {
    id: 'vip-shows',
    title: 'VIP / Ticketed Shows',
    icon: <Ticket className="w-6 h-6" />,
    color: 'text-yellow-400',
    description: 'Host exclusive ticketed shows for paying fans. Perfect for special performances or private content.',
    tips: [
      'Announce VIP shows in advance to build anticipation',
      'Set ticket prices that reflect the exclusive content',
      'Thank ticket holders during the show',
      'You can transition from a free stream to VIP mode'
    ],
    steps: [
      'During a live stream, tap "Announce VIP Show"',
      'Set your ticket price and show title',
      'Fans can purchase tickets to join',
      'Start VIP mode when ready to go exclusive'
    ]
  },
  {
    id: 'guest-calls',
    title: 'Guest Call-Ins',
    icon: <Phone className="w-6 h-6" />,
    color: 'text-blue-400',
    description: 'Invite viewers to join your stream as guests for video or voice calls.',
    tips: [
      'Great for Q&A sessions and fan interactions',
      'Screen requests before accepting',
      'You control when to end the guest appearance',
      'Works with both video and voice-only calls'
    ],
    steps: [
      'Viewers can request to join from the stream',
      'Review requests and accept who you want',
      'Guest appears in your stream overlay',
      'Remove guests anytime with one tap'
    ]
  },
  {
    id: 'recordings',
    title: 'Stream Recordings',
    icon: <Camera className="w-6 h-6" />,
    color: 'text-pink-400',
    description: 'Record your live streams to save and repurpose your content.',
    tips: [
      'Record highlights to share later',
      'Upload recordings as exclusive content',
      'Great for fans who missed the live show'
    ],
    steps: [
      'Tap the Record button during your stream',
      'Recording indicator appears when active',
      'Stop recording or it saves when stream ends',
      'Choose to save or discard after the stream'
    ]
  },
  {
    id: 'ai-twin',
    title: 'AI Twin',
    icon: <Sparkles className="w-6 h-6" />,
    color: 'text-cyan-400',
    description: 'Create an AI version of yourself that fans can chat with 24/7, even when you\'re offline.',
    tips: [
      'Train your AI Twin with your personality and interests',
      'Set your per-minute rate for AI conversations',
      'Fans love being able to chat anytime',
      'Review conversations to improve your AI Twin'
    ],
    steps: [
      'Go to AI Twin from your profile menu',
      'Complete the personality questionnaire',
      'Choose a voice that matches your style',
      'Set your pricing and enable your AI Twin'
    ]
  },
  {
    id: 'video-calls',
    title: 'Video Calls',
    icon: <Video className="w-6 h-6" />,
    color: 'text-orange-400',
    description: 'Offer private 1-on-1 video calls with fans. Set your own rates and availability.',
    tips: [
      'Set rates that value your time',
      'Minimum durations help ensure worthwhile calls',
      'Mark yourself unavailable when needed',
      'Fans can request calls from your profile'
    ],
    steps: [
      'Go to Pricing from your profile menu',
      'Set your per-minute video call rate',
      'Set minimum call duration',
      'Toggle availability on/off as needed'
    ]
  },
  {
    id: 'voice-calls',
    title: 'Voice Calls',
    icon: <Mic className="w-6 h-6" />,
    color: 'text-violet-400',
    description: 'Offer voice-only calls for fans who prefer audio conversations.',
    tips: [
      'Usually priced lower than video calls',
      'Great for casual conversations',
      'Can be done from anywhere'
    ]
  },
  {
    id: 'messages',
    title: 'Paid Messages',
    icon: <MessageSquare className="w-6 h-6" />,
    color: 'text-emerald-400',
    description: 'Charge fans per message to have conversations with you.',
    tips: [
      'Respond promptly to paying fans',
      'Set rates that reflect your availability',
      'Fans pay per message they send to you'
    ]
  },
  {
    id: 'tip-menu',
    title: 'Tip Menu',
    icon: <DollarSign className="w-6 h-6" />,
    color: 'text-green-400',
    description: 'Create a menu of actions fans can tip for during streams or anytime.',
    tips: [
      'Offer a variety of price points',
      'Include fun, interactive options',
      'Update your menu regularly',
      'Promote menu items during streams'
    ],
    steps: [
      'Go to Pricing > Tip Menu',
      'Add items with emojis, descriptions, and prices',
      'Toggle items on/off as needed',
      'Fans see your menu on your profile and in streams'
    ]
  },
  {
    id: 'virtual-gifts',
    title: 'Virtual Gifts',
    icon: <Gift className="w-6 h-6" />,
    color: 'text-rose-400',
    description: 'Fans can send you animated virtual gifts during streams. Each gift has a coin value you earn.',
    tips: [
      'React to gifts to encourage more',
      'Thank top gifters by name',
      'Bigger gifts get more attention in chat'
    ]
  },
  {
    id: 'digitals',
    title: 'Digitals',
    icon: <Image className="w-6 h-6" />,
    color: 'text-indigo-400',
    description: 'Sell exclusive digital content like photos and videos to your fans.',
    tips: [
      'Create exclusive content just for buyers',
      'Set prices based on content exclusivity',
      'Promote new releases to your audience'
    ],
    steps: [
      'Go to Upload from your profile menu',
      'Add your photo or video',
      'Set a price in coins',
      'Publish to make it available'
    ]
  },
  {
    id: 'pricing',
    title: 'Setting Your Prices',
    icon: <Coins className="w-6 h-6" />,
    color: 'text-amber-400',
    description: 'Configure your rates for calls, messages, and other paid interactions.',
    tips: [
      '10 coins = $1.00 in creator earnings',
      'Research what similar creators charge',
      'Start with competitive rates and adjust',
      'Premium pricing works with premium content'
    ],
    steps: [
      'Go to Pricing from your profile menu',
      'Set rates for video calls, voice calls, and messages',
      'Configure your tip menu',
      'Save changes to update your profile'
    ]
  }
];

export default function LearnPage() {
  const router = useRouter();
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  const toggleGuide = (id: string) => {
    setExpandedGuide(expandedGuide === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <MobileHeader title="Digis 101" showBack onBack={() => router.back()} />

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 mb-4">
            <GraduationCap className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Creator Academy</h1>
          <p className="text-gray-400 text-lg">
            Master all the tools to maximize your earnings and engagement
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{featureGuides.length}</div>
            <div className="text-xs text-gray-400">Features</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center">
            <div className="text-2xl font-bold text-green-400">$$$</div>
            <div className="text-xs text-gray-400">Earning Tools</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">24/7</div>
            <div className="text-xs text-gray-400">AI Twin</div>
          </div>
        </div>

        {/* Feature Guides */}
        <div className="space-y-3">
          {featureGuides.map((guide) => (
            <div
              key={guide.id}
              className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden transition-all"
            >
              {/* Header - Always visible */}
              <button
                onClick={() => toggleGuide(guide.id)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
              >
                <div className={`p-2.5 rounded-xl bg-white/10 ${guide.color}`}>
                  {guide.icon}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-white">{guide.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-1">{guide.description}</p>
                </div>
                {expandedGuide === guide.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Expanded Content */}
              {expandedGuide === guide.id && (
                <div className="px-5 pb-5 pt-2 border-t border-white/10">
                  <p className="text-gray-300 mb-4">{guide.description}</p>

                  {/* Steps */}
                  {guide.steps && guide.steps.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <Play className="w-4 h-4 text-cyan-400" />
                        How to Use
                      </h4>
                      <ol className="space-y-2">
                        {guide.steps.map((step, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span className="text-gray-300 text-sm">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Tips */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400" />
                      Pro Tips
                    </h4>
                    <ul className="space-y-2">
                      {guide.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-300 text-sm">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-8 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl border border-cyan-500/20 p-6 text-center">
          <Zap className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Ready to Earn?</h3>
          <p className="text-gray-400 mb-4">
            Start using these features to connect with fans and grow your income!
          </p>
          <button
            onClick={() => router.push('/creator/go-live')}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-full hover:opacity-90 transition-opacity"
          >
            Go Live Now
          </button>
        </div>
      </div>
    </div>
  );
}
