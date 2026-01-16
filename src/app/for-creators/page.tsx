'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dumbbell, Heart, Shirt, Sparkles, Camera, Apple, Users,
  ChevronDown, ChevronUp, Video, MessageSquare, Coins,
  Radio, Gift, Calendar, Bot, Share2, Layers,
  ArrowRight, CheckCircle, DollarSign, Clock, Zap
} from 'lucide-react';

interface Scenario {
  title: string;
  description: string;
  howItWorks: string;
  earning?: string;
}

interface NicheSection {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  scenarios: Scenario[];
}

const nicheSections: NicheSection[] = [
  {
    id: 'fitness',
    title: 'Fitness & Workout',
    subtitle: 'Personal trainers, gym influencers, HIIT coaches',
    icon: <Dumbbell className="w-6 h-6" />,
    color: 'text-orange-400',
    bgColor: 'from-orange-500/20 to-red-500/20',
    scenarios: [
      {
        title: 'Morning Workout Live Sessions',
        description: 'Instead of posting free workout reels on Instagram, go live on Digis every morning for a 30-minute HIIT session.',
        howItWorks: 'Set your stream as "Subscribers Only" so paying fans get exclusive access. Fans send fire emoji gifts when they crush a move, and you see the Tip Leaderboard showing your most engaged followers. After the stream, it auto-saves as a VOD that subscribers can replay anytime.',
        earning: '50 subscribers at $9.99/mo = $500/month recurring'
      },
      {
        title: 'Personalized Form Check Calls',
        description: 'A follower DMs you on Instagram asking about their squat form. Instead of typing paragraphs for free, direct them to Digis.',
        howItWorks: 'Tell them: "Book a video call with me on Digis." You charge $3/minute and do a quick 10-minute session reviewing their form live on camera.',
        earning: '10-minute call = $30 for personalized coaching'
      },
      {
        title: 'Monthly Fitness Challenge Subscriptions',
        description: 'Create tiered subscription plans that give fans different levels of access to your fitness content.',
        howItWorks: 'Bronze ($9.99/mo): Access to all workout streams. Silver ($24.99/mo): Streams + weekly meal plans sent via DM. Gold ($49.99/mo): Everything + one 15-min call per month for personalized coaching.',
        earning: 'Mix of 100 subscribers across tiers = $2,000+/month'
      },
      {
        title: 'Tip Menu for Custom Workouts',
        description: 'Set up purchasable items that fans can buy anytime from your profile.',
        howItWorks: 'Create items like: "Custom Ab Routine" (500 coins), "Glute Focus Workout PDF" (300 coins), "Form Review Video" (800 coins). Fans purchase and you fulfill — digital items can be auto-delivered.',
        earning: 'Passive income from items you create once'
      }
    ]
  },
  {
    id: 'yoga',
    title: 'Yoga & Wellness',
    subtitle: 'Yoga instructors, meditation guides, breathwork coaches',
    icon: <Heart className="w-6 h-6" />,
    color: 'text-pink-400',
    bgColor: 'from-pink-500/20 to-purple-500/20',
    scenarios: [
      {
        title: 'Guided Meditation Sessions',
        description: 'You teach yoga on Instagram but struggle to monetize. On Digis, schedule a weekly "Wind Down Wednesday" show.',
        howItWorks: 'Create a ticketed show at 8 PM — a 45-minute guided meditation. Charge 200 coins ($20) per ticket. Fans buy tickets in advance and join your exclusive session.',
        earning: '50 attendees x $20 = $1,000 per session'
      },
      {
        title: 'AI Twin for Daily Affirmations',
        description: "You can't be available 24/7, but your AI Twin can. Set it up with your voice and personality.",
        howItWorks: 'Configure your AI with a "Sweetheart" vibe and have it send calming affirmations to fans who message. The AI remembers their goals — "Hey Sarah, how did that morning stretch routine feel today?" Fans pay per message.',
        earning: 'Earn while you sleep — AI handles DMs 24/7'
      },
      {
        title: 'Private Breathwork Sessions',
        description: 'A stressed-out follower wants 1-on-1 help with anxiety. They request a video call on Digis.',
        howItWorks: 'You guide them through a 20-minute breathwork session at $2.50/minute. They feel better, you earned income, and there was no scheduling hassle.',
        earning: '20-minute session = $50'
      },
      {
        title: 'Subscriber-Only Content Library',
        description: 'Upload your best yoga flows as pay-per-view content that fans can purchase anytime.',
        howItWorks: 'Create content like: "30-Min Morning Flow" (150 coins), "Yoga for Back Pain" (200 coins), "Full Moon Ritual Practice" (250 coins). Once uploaded, it earns forever.',
        earning: 'Passive income from content created once'
      }
    ]
  },
  {
    id: 'fashion',
    title: 'Fashion & Style',
    subtitle: 'Fashion influencers, stylists, outfit creators',
    icon: <Shirt className="w-6 h-6" />,
    color: 'text-violet-400',
    bgColor: 'from-violet-500/20 to-indigo-500/20',
    scenarios: [
      {
        title: 'Live Try-On Haul Streams',
        description: 'You just got a PR package from a brand. Instead of posting a static TikTok, go live on Digis.',
        howItWorks: 'Do a real-time try-on haul where fans send gifts when they love a look. Use the polls feature — "Should I keep the red dress or return it?" This interaction is impossible on Instagram.',
        earning: 'Tips + gifts during a 1-hour haul = $200+'
      },
      {
        title: 'Personal Styling Video Calls',
        description: 'Followers always ask "What should I wear to X?" Turn those questions into paid consultations.',
        howItWorks: 'Offer styling consultations via video call. They show you their closet on camera, you help them put together outfits. Charge $4/minute for your expertise.',
        earning: '15-minute session = $60'
      },
      {
        title: 'Locked Outfit Reveals',
        description: 'Going to an event? Tease your look on Instagram and monetize the full reveal on Digis.',
        howItWorks: 'Post a teaser on IG: "See my full look breakdown on Digis." The full post is a locked message in DMs — fans pay 50 coins to unlock the complete outfit details with links.',
        earning: '100 unlocks x $5 = $500 per outfit reveal'
      },
      {
        title: 'Get Ready With Me Shows',
        description: 'Schedule a GRWM show before a big event like a party, date, or photoshoot.',
        howItWorks: 'Fans buy tickets to watch you do your hair, makeup, and outfit selection live. Chat with them, answer questions, and let them send tips when they love the look.',
        earning: '30 tickets at $10 + tips = $400+'
      }
    ]
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle & Beauty',
    subtitle: 'Beauty gurus, skincare experts, lifestyle influencers',
    icon: <Sparkles className="w-6 h-6" />,
    color: 'text-cyan-400',
    bgColor: 'from-cyan-500/20 to-teal-500/20',
    scenarios: [
      {
        title: 'Skincare Routine Breakdown',
        description: 'Your followers always ask about your skincare. Create a VOD walking through your full routine.',
        howItWorks: 'Record a detailed video showing every product, how you apply it, and why. Price it at 100 coins. Once uploaded, it earns money forever without you doing anything.',
        earning: 'Passive income — content works for you 24/7'
      },
      {
        title: 'Q&A Subscriber Streams',
        description: "Once a week, do a 'Subscribers Only' Q&A stream for your most loyal fans.",
        howItWorks: 'Your paying subscribers get to ask you anything — relationship advice, product recommendations, life updates. It feels exclusive and builds loyalty that keeps them subscribed.',
        earning: 'Builds retention = consistent monthly income'
      },
      {
        title: 'DM Consultations',
        description: 'A fan messages asking for advice on their skincare issues. Instead of replying for free, charge for your expertise.',
        howItWorks: 'You charge 25 coins per message. They get expert advice from someone they trust, you get compensated for your time and knowledge.',
        earning: '20 messages/day = $50/day passive'
      },
      {
        title: 'Birthday Shoutout Tips',
        description: 'Fans love personalized content. Add a tip menu item for custom video shoutouts.',
        howItWorks: 'Create a tip menu item: "Personalized Birthday Video" — 1000 coins ($100). Fans can buy a custom video shoutout from you for special occasions.',
        earning: '4 shoutouts/month = $400'
      }
    ]
  },
  {
    id: 'models',
    title: 'Models & Content Creators',
    subtitle: 'Instagram models, photographers, visual creators',
    icon: <Camera className="w-6 h-6" />,
    color: 'text-rose-400',
    bgColor: 'from-rose-500/20 to-pink-500/20',
    scenarios: [
      {
        title: 'Behind-the-Scenes Content',
        description: 'You do photoshoots all the time but only post the final images on IG. Monetize the rest.',
        howItWorks: 'Upload the raw behind-the-scenes clips as PPV content on Digis. Fans pay to see the unfiltered, exclusive side they cannot get anywhere else.',
        earning: '200 fans x $10 unlock = $2,000 per shoot'
      },
      {
        title: 'Fan Meet & Greet Calls',
        description: "Your biggest fans just want to talk to you. Give them that opportunity through paid video calls.",
        howItWorks: "Offer video calls where fans can chat for 5-10 minutes. At $3/minute, a 10-minute chat = $30. It's like a virtual meet-and-greet they'll never forget.",
        earning: '5 calls/week = $600/month'
      },
      {
        title: 'Exclusive Photo Sets',
        description: 'Upload a content gallery of 20 photos from a recent shoot. Set it as pay-per-view.',
        howItWorks: "Price the gallery at 500 coins ($50). Fans who really want exclusive content will pay for it. It's content you already have — now it makes money.",
        earning: '100 purchases = $5,000'
      },
      {
        title: 'Stream Goal for New Content',
        description: 'Going live? Set a stream goal to fund your next photoshoot or content creation.',
        howItWorks: 'Set a goal: "If we hit 5,000 coins, I\'ll do an exclusive photoshoot and post it for subscribers." Fans tip to hit the goal, you create content they asked for.',
        earning: 'Fans fund your content creation'
      }
    ]
  },
  {
    id: 'health',
    title: 'Health & Nutrition',
    subtitle: 'Nutritionists, meal prep creators, health coaches',
    icon: <Apple className="w-6 h-6" />,
    color: 'text-green-400',
    bgColor: 'from-green-500/20 to-emerald-500/20',
    scenarios: [
      {
        title: 'Meal Prep Live Streams',
        description: 'Every Sunday, go live doing your weekly meal prep. Fans watch, ask questions, and send tips.',
        howItWorks: 'Stream your entire meal prep process, explaining macros, ingredients, and techniques. Save it as a VOD so subscribers can rewatch the recipes anytime.',
        earning: 'Tips during stream + VOD sales after'
      },
      {
        title: 'Nutrition Consultation Calls',
        description: 'Followers always DM asking "What should I eat for X goal?" Stop giving away advice for free.',
        howItWorks: 'Offer 30-minute nutrition consultations via video call. Review their current diet, give personalized recommendations, and create a plan together.',
        earning: '30-min call at $2/min = $60 per session'
      },
      {
        title: 'Subscription Meal Plans',
        description: 'Create a premium subscription tier that includes weekly meal plans and exclusive content.',
        howItWorks: 'Gold tier subscription includes weekly meal plans delivered via DM + access to all your recipe content + priority responses to nutrition questions.',
        earning: '50 Gold subscribers at $30/mo = $1,500/month'
      },
      {
        title: 'Tip Menu for Recipes & Plans',
        description: 'Create purchasable items that fans can buy on-demand from your profile.',
        howItWorks: 'Items like: "My Exact Macro Breakdown" (200 coins), "Full Week Meal Plan PDF" (400 coins), "15-Min Diet Review Call" (600 coins).',
        earning: 'Recurring sales from items you create once'
      }
    ]
  }
];

const revenueStreams = [
  { icon: <Radio className="w-5 h-5" />, name: 'Live Streams', desc: 'Go live, receive gifts/tips in real-time' },
  { icon: <Video className="w-5 h-5" />, name: 'Video Calls', desc: '1-on-1 calls charged per minute' },
  { icon: <MessageSquare className="w-5 h-5" />, name: 'Paid DMs', desc: 'Charge per message sent/received' },
  { icon: <Layers className="w-5 h-5" />, name: 'Subscriptions', desc: 'Monthly recurring revenue, up to 5 tiers' },
  { icon: <DollarSign className="w-5 h-5" />, name: 'PPV Content', desc: 'Photos/videos fans pay to unlock' },
  { icon: <Calendar className="w-5 h-5" />, name: 'Ticketed Shows', desc: 'Scheduled events with paid entry' },
  { icon: <Gift className="w-5 h-5" />, name: 'Tip Menu', desc: 'Custom items/services fans can buy' },
  { icon: <Bot className="w-5 h-5" />, name: 'AI Twin', desc: 'Your AI chats with fans 24/7 for you' },
  { icon: <Share2 className="w-5 h-5" />, name: 'Referrals', desc: "Earn 5% of referred creators' earnings" },
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
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
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

      <div className="container max-w-5xl mx-auto px-4 py-10 pb-24">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            For Instagram & TikTok Creators
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Turn Your Following Into
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"> Real Income</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            See exactly how creators like you are using Digis to monetize their audience with live streams, video calls, subscriptions, and more.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
            <div className="text-2xl md:text-3xl font-bold text-white">10+</div>
            <div className="text-sm text-gray-400">Revenue Streams</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
            <div className="text-2xl md:text-3xl font-bold text-white">24/7</div>
            <div className="text-sm text-gray-400">AI Earns For You</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
            <div className="text-2xl md:text-3xl font-bold text-white">80%</div>
            <div className="text-sm text-gray-400">Creator Payout</div>
          </div>
        </div>

        {/* Niche Sections */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Users className="w-6 h-6 text-cyan-400" />
            Real-Life Scenarios By Niche
          </h2>
          <p className="text-gray-400 mb-6">
            Tap on your niche to see exactly how you can use Digis in your daily creator life.
          </p>

          <div className="space-y-3">
            {nicheSections.map((section) => (
              <div
                key={section.id}
                className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden transition-all"
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
                >
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${section.bgColor} ${section.color}`}>
                    {section.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-white">{section.title}</h3>
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
                        <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${section.bgColor} flex items-center justify-center text-xs font-bold ${section.color}`}>
                            {index + 1}
                          </span>
                          {scenario.title}
                        </h4>
                        <p className="text-gray-400 text-sm mb-3">{scenario.description}</p>
                        <div className="bg-white/5 rounded-lg p-3 mb-3">
                          <p className="text-gray-300 text-sm">
                            <span className="text-cyan-400 font-medium">How it works: </span>
                            {scenario.howItWorks}
                          </p>
                        </div>
                        {scenario.earning && (
                          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                            <Coins className="w-4 h-4" />
                            {scenario.earning}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* General Monetization Section */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-3xl border border-cyan-500/20 p-6 mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Works For Every Creator</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Convert Free Followers to Paying Fans</p>
                <p className="text-gray-400 text-sm">You have 500K on TikTok but make almost nothing. Put your Digis link in your bio and use Share Rewards to incentivize fans to promote you.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Make Money While You Sleep</p>
                <p className="text-gray-400 text-sm">Your AI Twin handles DMs and voice chats when you are offline. It is trained with your personality, your voice, and remembers each fan.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Earn From Other Creators</p>
                <p className="text-gray-400 text-sm">Know another creator who should be on Digis? Send them your referral link and earn 5% of their earnings for 12 months.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Tiered Fandom = More Revenue</p>
                <p className="text-gray-400 text-sm">Casual fans follow free. Dedicated fans pay $9.99/mo. Super fans pay $49.99/mo for calls and DMs. Everyone pays what they are comfortable with.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Streams Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-400" />
            All Your Revenue Streams
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {revenueStreams.map((stream, index) => (
              <div
                key={index}
                className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-3"
              >
                <div className="p-2 rounded-lg bg-white/10 text-cyan-400">
                  {stream.icon}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{stream.name}</p>
                  <p className="text-gray-400 text-xs">{stream.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How Coins Work */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-12">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            How Coins Work
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-cyan-400 mb-1">10 coins</div>
              <div className="text-gray-400">= $1 fan purchase</div>
            </div>
            <div className="text-center p-4 border-y md:border-y-0 md:border-x border-white/10">
              <div className="text-3xl font-bold text-green-400 mb-1">80%</div>
              <div className="text-gray-400">goes to you</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-yellow-400 mb-1">Weekly</div>
              <div className="text-gray-400">payouts available</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-3xl border border-cyan-500/30 p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Ready to Start Earning?
          </h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Join thousands of creators who are already monetizing their audience on Digis. Setup takes less than 5 minutes.
          </p>
          <Link
            href="/become-creator"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-full text-lg hover:opacity-90 transition-opacity"
          >
            Become a Creator
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-gray-500 text-sm mt-4">
            Free to join. No monthly fees. You only pay when you earn.
          </p>
        </div>
      </div>
    </div>
  );
}
