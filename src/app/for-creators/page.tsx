'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dumbbell, Heart, Shirt, Sparkles, Camera, Apple,
  ChevronDown, ChevronUp, Bot, MessageSquare, Video,
  Ticket, Gift, Users, ArrowRight, Zap
} from 'lucide-react';

interface Scenario {
  title: string;
  content: React.ReactNode;
}

interface NicheSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  emoji: string;
  color: string;
  bgColor: string;
  scenarios: Scenario[];
}

const nicheSections: NicheSection[] = [
  {
    id: 'fitness',
    title: 'FITNESS & WORKOUT GIRLIES',
    subtitle: 'Gym creators · Pilates · HIIT · booty bands · trainers',
    icon: <Dumbbell className="w-6 h-6" />,
    emoji: '💪',
    color: 'text-orange-400',
    bgColor: 'from-orange-500/20 to-red-500/20',
    scenarios: [
      {
        title: '"Morning Abs With Me" — but paid',
        content: (
          <>
            <p className="text-gray-300 mb-3">You already film your workouts for free.<br />Instead:</p>
            <ul className="space-y-2 text-gray-300 mb-4">
              <li>• Go live on Digis for <span className="text-cyan-400">subscribers only</span></li>
              <li>• Fans send gifts when they finish a set</li>
              <li>• Stream saves automatically as a replay</li>
            </ul>
            <p className="text-green-400 font-semibold">👉 50 subscribers × $9.99 = $500/mo just for doing what you already do</p>
          </>
        )
      },
      {
        title: 'Form Checks = Cash, Not Free DMs',
        content: (
          <>
            <p className="text-gray-400 mb-2">Fan: "Can you check my squat form?"</p>
            <p className="text-gray-500 mb-2">Old you: <span className="line-through">types 8 paragraphs for free</span></p>
            <p className="text-white mb-3">New you:</p>
            <p className="text-cyan-400 mb-3">"Book a 10-min video call on my Digis 💖"</p>
            <p className="text-green-400 font-semibold">$3/min × 10 min = $30 for one quick call</p>
          </>
        )
      },
      {
        title: 'Fitness Challenge Club',
        content: (
          <>
            <p className="text-gray-300 mb-3">Create tiers:</p>
            <ul className="space-y-2 text-gray-300 mb-4">
              <li><span className="text-yellow-400">$9.99</span> — all workout lives</li>
              <li><span className="text-yellow-400">$24.99</span> — lives + meal ideas</li>
              <li><span className="text-yellow-400">$49.99</span> — lives + 1 coaching call</li>
            </ul>
            <p className="text-green-400 font-semibold">100 mixed fans = $2,000+/mo</p>
          </>
        )
      },
      {
        title: 'Sell Stuff You Already Made',
        content: (
          <>
            <ul className="space-y-2 text-gray-300 mb-4">
              <li>• "Booty Builder PDF"</li>
              <li>• "My exact gym split"</li>
              <li>• "Stretch routine video"</li>
            </ul>
            <p className="text-green-400 font-semibold">Upload once → sell forever 💸</p>
          </>
        )
      }
    ]
  },
  {
    id: 'yoga',
    title: 'YOGA & WELLNESS',
    subtitle: 'Yoga · meditation · mental health · self love',
    icon: <Heart className="w-6 h-6" />,
    emoji: '🧘‍♀️',
    color: 'text-pink-400',
    bgColor: 'from-pink-500/20 to-purple-500/20',
    scenarios: [
      {
        title: 'Cozy Live Classes',
        content: (
          <p className="text-gray-300">Light a candle, press "Go Live," get paid per viewer instead of random IG likes.</p>
        )
      },
      {
        title: 'Private Energy Sessions',
        content: (
          <>
            <p className="text-gray-300 mb-2">10-minute breathing call</p>
            <p className="text-yellow-400 mb-2">$25 each</p>
            <p className="text-green-400 font-semibold">Do 3 a day = $75/day</p>
          </>
        )
      },
      {
        title: 'Voice Messages That Heal',
        content: (
          <>
            <p className="text-gray-300 mb-3">Fans pay for:</p>
            <ul className="space-y-2 text-gray-300 mb-4">
              <li>• Morning affirmations</li>
              <li>• Anxiety calm downs</li>
              <li>• Sleep meditations</li>
            </ul>
            <p className="text-green-400 font-semibold">Your voice = income 🎧</p>
          </>
        )
      }
    ]
  },
  {
    id: 'fashion',
    title: 'FASHION & STYLE GIRLS',
    subtitle: 'outfits · hauls · styling',
    icon: <Shirt className="w-6 h-6" />,
    emoji: '👗',
    color: 'text-violet-400',
    bgColor: 'from-violet-500/20 to-indigo-500/20',
    scenarios: [
      {
        title: '"Rate My Fit" Calls',
        content: (
          <>
            <p className="text-gray-300 mb-2">Fans hop on video</p>
            <p className="text-gray-300 mb-2">You style them from their closet</p>
            <p className="text-green-400 font-semibold">$2/min</p>
          </>
        )
      },
      {
        title: 'Paid Hauls',
        content: (
          <>
            <p className="text-gray-300 mb-3">Instead of posting free try-ons:</p>
            <ul className="space-y-2 text-gray-300">
              <li>• Upload as PPV</li>
              <li>• Subscribers only</li>
              <li>• Early access drops</li>
            </ul>
          </>
        )
      },
      {
        title: 'Closet Links & Commissions',
        content: (
          <>
            <p className="text-gray-300 mb-3">Create:</p>
            <ul className="space-y-2 text-gray-300">
              <li>• "My Miami outfits pack"</li>
              <li>• "Date night looks"</li>
              <li>• "Festival fits"</li>
            </ul>
          </>
        )
      }
    ]
  },
  {
    id: 'beauty',
    title: 'BEAUTY & LIFESTYLE',
    subtitle: 'makeup · skincare · GRWM',
    icon: <Sparkles className="w-6 h-6" />,
    emoji: '💄',
    color: 'text-cyan-400',
    bgColor: 'from-cyan-500/20 to-teal-500/20',
    scenarios: [
      {
        title: 'GRWM Live = Tip Party',
        content: (
          <>
            <p className="text-gray-300 mb-3">Fans tip while you:</p>
            <ul className="space-y-2 text-gray-300">
              <li>• Do makeup</li>
              <li>• Spill tea</li>
              <li>• Pick tonight's look</li>
            </ul>
          </>
        )
      },
      {
        title: 'Skin Help Calls',
        content: (
          <>
            <p className="text-gray-300 mb-2">"Help me fix my routine"</p>
            <p className="text-green-400 font-semibold">15 min × $2 = $30</p>
          </>
        )
      },
      {
        title: 'Product Drop Nights',
        content: (
          <p className="text-gray-300">Ticketed live where you reveal your favs.</p>
        )
      }
    ]
  },
  {
    id: 'models',
    title: 'MODELS & VISUAL CREATORS',
    subtitle: 'Instagram models · photographers',
    icon: <Camera className="w-6 h-6" />,
    emoji: '📸',
    color: 'text-rose-400',
    bgColor: 'from-rose-500/20 to-pink-500/20',
    scenarios: [
      {
        title: 'BTS Shoots',
        content: (
          <p className="text-gray-300">Post behind-the-scenes as PPV instead of free stories.</p>
        )
      },
      {
        title: '1-on-1 Fan Calls',
        content: (
          <p className="text-gray-300">Superfans pay to talk to <span className="text-cyan-400">YOU</span>.</p>
        )
      },
      {
        title: 'Custom Content Menu',
        content: (
          <ul className="space-y-2 text-gray-300">
            <li>• Name shoutout</li>
            <li>• Pose pack</li>
            <li>• Polaroid style set</li>
          </ul>
        )
      }
    ]
  },
  {
    id: 'health',
    title: 'HEALTH & NUTRITION',
    subtitle: 'meal prep · wellness',
    icon: <Apple className="w-6 h-6" />,
    emoji: '🥗',
    color: 'text-green-400',
    bgColor: 'from-green-500/20 to-emerald-500/20',
    scenarios: [
      {
        title: '"Eat With Me" Lives',
        content: (
          <p className="text-gray-300">Cook dinner together — paid room.</p>
        )
      },
      {
        title: 'Custom Meal Plans',
        content: (
          <p className="text-gray-300">Fans buy directly from your tip menu.</p>
        )
      }
    ]
  }
];

export default function ForCreatorsPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('fitness');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/10">
        <div className="container max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/images/digis-logo-white.png"
              alt="Digis"
              width={100}
              height={33}
              className="h-8 w-auto"
            />
          </Link>
          <Link
            href="/become-creator"
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-full text-sm hover:opacity-90 transition-opacity"
          >
            Start Earning
          </Link>
        </div>
      </div>

      <div className="container max-w-3xl mx-auto px-4 py-10 pb-24">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            🌟 TURN YOUR FOLLOWING INTO{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">REAL INCOME</span>
          </h1>
          <p className="text-xl text-gray-400 mb-6">
            No weird corporate stuff. Just you, your vibe, your fans — <span className="text-green-400">paid</span>.
          </p>
          <p className="text-gray-500 max-w-xl mx-auto">
            You already post, reply, FaceTime, go live, give advice, hype your girls…<br />
            <span className="text-white">Digis just makes all of that PAY you.</span>
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
            <div className="text-2xl font-bold text-white">10+</div>
            <div className="text-xs text-gray-400">Ways to Earn</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
            <div className="text-2xl font-bold text-white">24/7</div>
            <div className="text-xs text-gray-400">AI That Talks Like You</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
            <div className="text-2xl font-bold text-white">80%</div>
            <div className="text-xs text-gray-400">Creator Payout</div>
          </div>
        </div>

        {/* Tap Your Vibe */}
        <div className="text-center mb-6">
          <p className="text-xl text-white font-semibold">👇 Tap your vibe 👇</p>
        </div>

        {/* Niche Sections */}
        <div className="space-y-3 mb-12">
          {nicheSections.map((section) => (
            <div
              key={section.id}
              className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
              >
                <div className={`p-3 rounded-xl bg-gradient-to-br ${section.bgColor}`}>
                  <span className="text-2xl">{section.emoji}</span>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-base font-bold text-white">{section.title}</h3>
                  <p className="text-sm text-gray-400">{section.subtitle}</p>
                </div>
                {expandedSection === section.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Expanded Scenarios */}
              {expandedSection === section.id && (
                <div className="px-5 pb-5 pt-2 border-t border-white/10 space-y-4">
                  {section.scenarios.map((scenario, index) => (
                    <div
                      key={index}
                      className="bg-black/30 rounded-xl p-4 border border-white/5"
                    >
                      <h4 className="text-white font-semibold mb-3">{index + 1}) {scenario.title}</h4>
                      {scenario.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* The Big Ones */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-white mb-6 text-center">
            🚨 THE BIG ONES EVERY CREATOR USES
          </h2>

          <div className="space-y-4">
            {/* AI Twin */}
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Bot className="w-6 h-6 text-purple-400" />
                <h3 className="text-xl font-bold text-white">🔥 AI TWIN = MONEY WHILE YOU SLEEP</h3>
              </div>
              <p className="text-gray-300 mb-3">Your AI talks like YOU:</p>
              <ul className="space-y-2 text-gray-300 mb-4">
                <li>• Replies to DMs</li>
                <li>• Voice chats with fans</li>
                <li>• Remembers their name & convos</li>
              </ul>
              <p className="text-green-400 font-semibold">You wake up → you already earned.</p>
            </div>

            {/* Paid DMs */}
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-500/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-white">💬 PAID DMs</h3>
              </div>
              <p className="text-gray-300 mb-3">No more free therapy in IG inbox.</p>
              <ul className="space-y-2 text-gray-300">
                <li>• Fans pay to message you</li>
                <li>• You answer when you want</li>
                <li>• AI handles the rest</li>
              </ul>
            </div>

            {/* Video Calls */}
            <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl border border-orange-500/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Video className="w-6 h-6 text-orange-400" />
                <h3 className="text-xl font-bold text-white">🎥 VIDEO CALLS</h3>
              </div>
              <p className="text-gray-300 mb-3">Like FaceTime but paid:</p>
              <ul className="space-y-2 text-gray-300">
                <li>• Advice</li>
                <li>• Styling</li>
                <li>• Life talks</li>
                <li>• Coaching</li>
                <li>• Just saying hi 💕</li>
              </ul>
            </div>

            {/* Ticketed Events */}
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl border border-yellow-500/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Ticket className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl font-bold text-white">🎟 TICKETED EVENTS</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">Movie night</span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">Workout class</span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">Girl talk live</span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">Fashion show stream</span>
              </div>
            </div>

            {/* Tip Menu */}
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl border border-green-500/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Gift className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-bold text-white">🎁 TIP MENU</h3>
              </div>
              <p className="text-gray-300 mb-3">Create anything:</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">"Custom selfie"</span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">"Voice note"</span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">"Workout plan"</span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300">"Good morning message"</span>
              </div>
            </div>

            {/* Referrals */}
            <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-2xl border border-pink-500/30 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-6 h-6 text-pink-400" />
                <h3 className="text-xl font-bold text-white">🤝 REFERRALS</h3>
              </div>
              <p className="text-gray-300">Bring your bestie → <span className="text-green-400 font-semibold">earn 5% of her income for a year</span></p>
            </div>
          </div>
        </div>

        {/* Real Examples */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-white mb-6 text-center">
            💅 REAL EXAMPLES
          </h2>

          <div className="space-y-4">
            <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
              <h3 className="text-lg font-bold text-white mb-3">Scenario A – The IG Model</h3>
              <p className="text-gray-400 mb-3">You have 120k on TikTok<br />Make $0</p>
              <p className="text-white mb-2">Add Digis link:</p>
              <ul className="space-y-1 text-gray-300 mb-3">
                <li>• 200 fans join at $9.99</li>
                <li>• 15 calls a week</li>
                <li>• AI replies</li>
              </ul>
              <p className="text-green-400 font-bold text-lg">= $3k–$6k/month</p>
            </div>

            <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
              <h3 className="text-lg font-bold text-white mb-3">Scenario B – The Gym Girl</h3>
              <p className="text-gray-400 mb-3">Post workouts anyway<br />Now:</p>
              <ul className="space-y-1 text-gray-300 mb-3">
                <li>• Subscribers</li>
                <li>• Form calls</li>
                <li>• PDFs</li>
              </ul>
              <p className="text-green-400 font-bold text-lg">= $2k/month without brand deals</p>
            </div>

            <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
              <h3 className="text-lg font-bold text-white mb-3">Scenario C – The Lifestyle Babe</h3>
              <p className="text-gray-400 mb-3">Just chatting + GRWM</p>
              <ul className="space-y-1 text-gray-300 mb-3">
                <li>• Tips</li>
                <li>• Paid DMs</li>
                <li>• AI twin</li>
              </ul>
              <p className="text-green-400 font-bold text-lg">= income from being YOU.</p>
            </div>
          </div>
        </div>

        {/* The Vibe */}
        <div className="text-center mb-10 py-8 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-3xl border border-white/10">
          <p className="text-xl text-gray-400 mb-2">Instagram = likes</p>
          <p className="text-3xl font-black text-white mb-4">Digis = money 💸</p>
          <p className="text-gray-400">
            You don't change who you are.<br />
            <span className="text-white font-semibold">You just stop doing it for free.</span>
          </p>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Link
            href="/become-creator"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-full text-xl hover:opacity-90 transition-opacity"
          >
            <Zap className="w-6 h-6" />
            Start Earning Now
            <ArrowRight className="w-6 h-6" />
          </Link>
          <p className="text-gray-500 text-sm mt-4">
            Free to join · No monthly fees · Get paid weekly
          </p>
        </div>
      </div>
    </div>
  );
}
