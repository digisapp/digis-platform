'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
  id: string;
  content: React.ReactNode;
  bg: string;
}

const slides: Slide[] = [
  {
    id: 'intro',
    bg: 'from-purple-600 via-pink-500 to-orange-400',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-white/80 text-lg mb-2">ok so like...</p>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
          what if you got PAID
        </h1>
        <p className="text-2xl md:text-3xl text-white/90 font-bold">
          for what you already do for free? 👀
        </p>
        <div className="mt-8 flex items-center gap-2 text-white/60 text-sm">
          <span>swipe</span>
          <ChevronRight className="w-4 h-4 animate-pulse" />
        </div>
      </div>
    )
  },
  {
    id: 'problem',
    bg: 'from-gray-900 via-gray-800 to-gray-900',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-6xl mb-6">😩</p>
        <p className="text-xl text-gray-400 mb-4">you rn:</p>
        <div className="space-y-3 text-left">
          <p className="text-white text-lg">✓ posting fire content</p>
          <p className="text-white text-lg">✓ answering DMs for hours</p>
          <p className="text-white text-lg">✓ giving free advice</p>
          <p className="text-white text-lg">✓ going live for likes</p>
        </div>
        <p className="text-3xl font-black text-red-400 mt-6">making $0</p>
      </div>
    )
  },
  {
    id: 'solution',
    bg: 'from-emerald-500 via-cyan-500 to-blue-500',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-6xl mb-6">✨</p>
        <p className="text-xl text-white/80 mb-2">enter:</p>
        <h2 className="text-5xl font-black text-white mb-4">Digis</h2>
        <p className="text-xl text-white/90">
          same you, same content
        </p>
        <p className="text-2xl font-bold text-white mt-2">
          but now it PAYS 💸
        </p>
      </div>
    )
  },
  {
    id: 'paid-dms',
    bg: 'from-blue-600 via-blue-500 to-cyan-400',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-5xl mb-4">💬</p>
        <h2 className="text-3xl font-black text-white mb-4">PAID DMs</h2>
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-4 max-w-xs">
          <p className="text-white/60 text-sm mb-1">fan:</p>
          <p className="text-white">"omg can you help me with my skincare routine?"</p>
        </div>
        <p className="text-white/80 mb-2">old you: types essay for free</p>
        <p className="text-xl font-bold text-white">new you: gets $2.50/msg 💅</p>
        <p className="text-green-300 font-semibold mt-4">20 msgs = $50</p>
      </div>
    )
  },
  {
    id: 'video-calls',
    bg: 'from-orange-500 via-pink-500 to-rose-500',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-5xl mb-4">📱</p>
        <h2 className="text-3xl font-black text-white mb-4">VIDEO CALLS</h2>
        <p className="text-white/90 text-lg mb-4">
          like FaceTime but make it ✨paid✨
        </p>
        <div className="space-y-2 text-white/80">
          <p>• styling sessions</p>
          <p>• fitness form checks</p>
          <p>• life advice</p>
          <p>• just vibing</p>
        </div>
        <p className="text-yellow-300 font-bold text-xl mt-6">
          $3/min × 10 min = $30 🤑
        </p>
      </div>
    )
  },
  {
    id: 'go-live',
    bg: 'from-red-500 via-rose-500 to-pink-500',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-red-300 rounded-full animate-pulse" />
          <p className="text-white font-bold">LIVE</p>
        </div>
        <h2 className="text-3xl font-black text-white mb-4">GO LIVE & GET TIPPED</h2>
        <p className="text-white/90 text-lg mb-4">
          GRWM, workout, just chatting...
        </p>
        <p className="text-white/80 mb-2">fans send gifts while you stream</p>
        <div className="flex gap-2 text-3xl my-4">
          <span>🌹</span><span>💎</span><span>🔥</span><span>⭐</span>
        </div>
        <p className="text-yellow-300 font-bold">
          1 hour live = $100-500 in tips
        </p>
      </div>
    )
  },
  {
    id: 'subscriptions',
    bg: 'from-violet-600 via-purple-500 to-fuchsia-500',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-5xl mb-4">💖</p>
        <h2 className="text-3xl font-black text-white mb-4">SUBSCRIPTIONS</h2>
        <p className="text-white/90 text-lg mb-4">
          your ride or dies pay monthly
        </p>
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 space-y-2">
          <p className="text-white">$9.99/mo → exclusive content</p>
          <p className="text-white">$24.99/mo → + DM access</p>
          <p className="text-white">$49.99/mo → + monthly call</p>
        </div>
        <p className="text-green-300 font-bold mt-4">
          100 subs = $1k-5k/month 📈
        </p>
      </div>
    )
  },
  {
    id: 'ai-twin',
    bg: 'from-cyan-500 via-blue-600 to-purple-600',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-5xl mb-4">🤖✨</p>
        <h2 className="text-3xl font-black text-white mb-2">AI TWIN</h2>
        <p className="text-xl text-white/90 mb-4">bestie this one's crazy</p>
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-left space-y-2 mb-4">
          <p className="text-white">• talks like YOU</p>
          <p className="text-white">• answers DMs 24/7</p>
          <p className="text-white">• does voice chats</p>
          <p className="text-white">• remembers every fan</p>
        </div>
        <p className="text-yellow-300 font-bold text-lg">
          you sleep → it earns 💤💰
        </p>
      </div>
    )
  },
  {
    id: 'tip-menu',
    bg: 'from-green-500 via-emerald-500 to-teal-500',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-5xl mb-4">🎁</p>
        <h2 className="text-3xl font-black text-white mb-4">TIP MENU</h2>
        <p className="text-white/90 mb-4">sell literally anything:</p>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <span className="px-3 py-2 bg-white/20 rounded-full text-white text-sm">"custom selfie" $15</span>
          <span className="px-3 py-2 bg-white/20 rounded-full text-white text-sm">"voice note" $10</span>
          <span className="px-3 py-2 bg-white/20 rounded-full text-white text-sm">"workout plan" $25</span>
          <span className="px-3 py-2 bg-white/20 rounded-full text-white text-sm">"outfit help" $20</span>
        </div>
        <p className="text-white/80">create once, sell forever</p>
      </div>
    )
  },
  {
    id: 'fitness',
    bg: 'from-orange-500 via-red-500 to-rose-500',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-5xl mb-4">💪</p>
        <h2 className="text-2xl font-black text-white mb-2">FITNESS GIRLIES</h2>
        <p className="text-white/80 text-sm mb-4">this is literally you:</p>
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-left space-y-2 mb-4 text-sm">
          <p className="text-white">• "morning abs with me" but PAID</p>
          <p className="text-white">• form check calls = $30</p>
          <p className="text-white">• booty builder PDF = passive income</p>
          <p className="text-white">• subscribers for workout lives</p>
        </div>
        <p className="text-yellow-300 font-bold">gym content → $2k/mo easy</p>
      </div>
    )
  },
  {
    id: 'fashion',
    bg: 'from-pink-500 via-fuchsia-500 to-purple-500',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-5xl mb-4">👗</p>
        <h2 className="text-2xl font-black text-white mb-2">FASHION BABES</h2>
        <p className="text-white/80 text-sm mb-4">your closet = income:</p>
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-left space-y-2 mb-4 text-sm">
          <p className="text-white">• "rate my fit" video calls</p>
          <p className="text-white">• paid hauls & try-ons</p>
          <p className="text-white">• "my miami outfits" pack</p>
          <p className="text-white">• GRWM streams with tips</p>
        </div>
        <p className="text-yellow-300 font-bold">style advice → $$$</p>
      </div>
    )
  },
  {
    id: 'wellness',
    bg: 'from-teal-500 via-cyan-500 to-blue-500',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-5xl mb-4">🧘‍♀️</p>
        <h2 className="text-2xl font-black text-white mb-2">WELLNESS QUEENS</h2>
        <p className="text-white/80 text-sm mb-4">your peace = their peace:</p>
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-left space-y-2 mb-4 text-sm">
          <p className="text-white">• guided meditation lives</p>
          <p className="text-white">• breathwork video calls</p>
          <p className="text-white">• voice note affirmations</p>
          <p className="text-white">• skincare routine VODs</p>
        </div>
        <p className="text-yellow-300 font-bold">healing energy → income ✨</p>
      </div>
    )
  },
  {
    id: 'models',
    bg: 'from-rose-500 via-pink-500 to-red-400',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-5xl mb-4">📸</p>
        <h2 className="text-2xl font-black text-white mb-2">MODELS & CREATORS</h2>
        <p className="text-white/80 text-sm mb-4">your content = gold:</p>
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-left space-y-2 mb-4 text-sm">
          <p className="text-white">• BTS as PPV content</p>
          <p className="text-white">• 1-on-1 fan video calls</p>
          <p className="text-white">• exclusive photo sets</p>
          <p className="text-white">• custom content menu</p>
        </div>
        <p className="text-yellow-300 font-bold">200 fans × $10 = $2k 💰</p>
      </div>
    )
  },
  {
    id: 'math',
    bg: 'from-emerald-500 via-green-500 to-teal-500',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-4xl mb-4">📱→💸</p>
        <h2 className="text-2xl font-black text-white mb-4">THE MATH IS MATHING</h2>
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 space-y-3 text-left">
          <div className="flex justify-between text-white">
            <span>100 subs × $10</span>
            <span className="font-bold">$1,000</span>
          </div>
          <div className="flex justify-between text-white">
            <span>20 calls × $30</span>
            <span className="font-bold">$600</span>
          </div>
          <div className="flex justify-between text-white">
            <span>DMs + AI</span>
            <span className="font-bold">$500</span>
          </div>
          <div className="flex justify-between text-white">
            <span>tips + content</span>
            <span className="font-bold">$400</span>
          </div>
          <div className="border-t border-white/20 pt-2 flex justify-between text-yellow-300 font-black text-xl">
            <span>TOTAL</span>
            <span>$2,500/mo</span>
          </div>
        </div>
        <p className="text-white/80 text-sm mt-4">and that's being conservative 💅</p>
      </div>
    )
  },
  {
    id: 'referrals',
    bg: 'from-pink-500 via-rose-500 to-orange-400',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-5xl mb-4">👯‍♀️</p>
        <h2 className="text-3xl font-black text-white mb-4">BRING YOUR BESTIES</h2>
        <p className="text-white/90 text-lg mb-4">
          refer a creator friend
        </p>
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4">
          <p className="text-2xl font-bold text-white">earn 5% of her income</p>
          <p className="text-white/80">for a YEAR</p>
        </div>
        <p className="text-yellow-300 font-bold">
          she makes $3k → you get $150/mo 🤝
        </p>
      </div>
    )
  },
  {
    id: 'vibe-check',
    bg: 'from-violet-600 via-purple-500 to-pink-500',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <h2 className="text-3xl font-black text-white mb-6">THE VIBE CHECK:</h2>
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-center gap-4">
            <span className="text-white/60 text-xl">Instagram</span>
            <span className="text-white/40">=</span>
            <span className="text-white/60 text-xl">likes</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <span className="text-white text-2xl font-bold">Digis</span>
            <span className="text-white/40">=</span>
            <span className="text-green-400 text-2xl font-bold">money 💸</span>
          </div>
        </div>
        <p className="text-white/80 text-lg">
          you don't change who you are
        </p>
        <p className="text-white font-bold text-xl mt-2">
          you just stop doing it for free
        </p>
      </div>
    )
  },
  {
    id: 'cta',
    bg: 'from-cyan-500 via-blue-500 to-purple-600',
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-5xl mb-4">🚀</p>
        <h2 className="text-3xl font-black text-white mb-4">READY TO GET PAID?</h2>
        <p className="text-white/80 mb-6">
          free to join · no monthly fees · 100% payout
        </p>
        <Link
          href="/become-creator"
          className="px-8 py-4 bg-white text-gray-900 font-black rounded-full text-xl hover:scale-105 transition-transform flex items-center gap-2"
        >
          START EARNING
          <ArrowRight className="w-6 h-6" />
        </Link>
        <p className="text-white/60 text-sm mt-6">
          takes like 2 mins to set up fr fr
        </p>
      </div>
    )
  }
];

export default function ForCreatorsPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
    }
  };

  const nextSlide = () => goToSlide(currentSlide + 1);
  const prevSlide = () => goToSlide(currentSlide - 1);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (diff > threshold) {
      nextSlide();
    } else if (diff < -threshold) {
      prevSlide();
    }
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex items-center justify-between">
        <Link href="/">
          <Image
            src="/images/digis-logo-white.png"
            alt="Digis"
            width={80}
            height={27}
            className="h-6 w-auto opacity-80"
          />
        </Link>
        <Link
          href="/become-creator"
          className="px-4 py-2 bg-white/20 backdrop-blur text-white font-semibold rounded-full text-sm hover:bg-white/30 transition-colors"
        >
          Join Free
        </Link>
      </div>

      {/* Carousel */}
      <div
        ref={containerRef}
        className="h-full w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="h-full flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className={`h-full w-full flex-shrink-0 bg-gradient-to-br ${slide.bg}`}
            >
              {slide.content}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows - Desktop */}
      <div className="hidden md:flex absolute inset-y-0 left-0 items-center pl-4">
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="p-3 bg-black/30 backdrop-blur rounded-full text-white disabled:opacity-30 hover:bg-black/50 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>
      <div className="hidden md:flex absolute inset-y-0 right-0 items-center pr-4">
        <button
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className="p-3 bg-black/30 backdrop-blur rounded-full text-white disabled:opacity-30 hover:bg-black/50 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Progress Dots */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 px-4">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-1.5 rounded-full transition-all ${
              index === currentSlide
                ? 'w-6 bg-white'
                : 'w-1.5 bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* Slide Counter */}
      <div className="absolute bottom-16 left-0 right-0 flex justify-center">
        <span className="text-white/50 text-sm">
          {currentSlide + 1} / {slides.length}
        </span>
      </div>
    </div>
  );
}
