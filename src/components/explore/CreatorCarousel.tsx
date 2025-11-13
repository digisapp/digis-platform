'use client';

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Verified, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard } from '@/components/ui';

interface FeaturedCreator {
  id: string;
  username: string;
  displayName: string | null;
  creatorCardImageUrl: string | null;
  isCreatorVerified: boolean;
  isOnline: boolean;
  isTrending: boolean;
  followerCount: number;
}

interface CreatorCarouselProps {
  creators: FeaturedCreator[];
  autoPlay?: boolean;
  interval?: number;
}

export function CreatorCarousel({
  creators,
  autoPlay = true,
  interval = 5000
}: CreatorCarouselProps) {
  const router = useRouter();
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'start',
      skipSnaps: false,
      dragFree: false,
    },
    autoPlay ? [Autoplay({ delay: interval, stopOnInteraction: true })] : []
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!creators || creators.length === 0) {
    return null;
  }

  return (
    <div className="relative" role="region" aria-label="Featured Creators Carousel">
      {/* Carousel Container */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-3 md:gap-4">
          {creators.map((creator, index) => (
            <div
              key={creator.id}
              className="relative flex-[0_0_28%] sm:flex-[0_0_18%] md:flex-[0_0_120px] min-w-0"
            >
              <div
                className="overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl group h-full bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-purple-200 hover:border-digis-cyan/70"
                onClick={() => router.push(`/${creator.username}`)}
              >
                {/* 3:4 Portrait Image */}
                <div className="relative w-full" style={{ paddingBottom: '133.33%' }}>
                  {creator.creatorCardImageUrl ? (
                    <>
                      <img
                        src={creator.creatorCardImageUrl}
                        alt={creator.displayName || creator.username}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading={index < 2 ? 'eager' : 'lazy'}
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20" />
                  )}

                  {/* Top badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {creator.isOnline && (
                        <div
                          className="h-2 w-2 rounded-full bg-green-500 shadow-lg animate-pulse"
                          aria-label="Online"
                        />
                      )}
                      {creator.isTrending && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gradient-to-r from-digis-pink to-digis-purple text-white shadow-lg backdrop-blur-sm">
                          Trending
                        </span>
                      )}
                    </div>
                    {creator.isCreatorVerified && (
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-1">
                        <Verified
                          className="w-3.5 h-3.5 text-digis-cyan fill-digis-cyan"
                          aria-label="Verified creator"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bottom overlay - Creator info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                    <h3 className="text-white font-bold text-base md:text-lg leading-tight mb-1 truncate">
                      {creator.displayName || creator.username}
                    </h3>
                    <p className="text-white/90 text-xs md:text-sm">
                      {creator.followerCount.toLocaleString()} followers
                    </p>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <span className="text-white font-bold text-sm md:text-base px-6 py-2.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                      View Profile
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows - Desktop only */}
      <div className="hidden md:block">
        {canScrollPrev && (
          <button
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all duration-200 shadow-lg z-10"
            aria-label="Previous creator"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}
        {canScrollNext && (
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all duration-200 shadow-lg z-10"
            aria-label="Next creator"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Pagination dots */}
      <div className="flex items-center justify-center gap-1.5 mt-4" role="tablist" aria-label="Carousel pagination">
        {creators.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === selectedIndex
                ? 'w-6 bg-gradient-to-r from-digis-cyan to-digis-pink'
                : 'w-1.5 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
            aria-selected={index === selectedIndex}
            role="tab"
          />
        ))}
      </div>
    </div>
  );
}
