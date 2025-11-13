'use client';

import { useRef, useEffect, useState } from 'react';

interface CategoryPillsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryPills({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryPillsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(true);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setShowLeftShadow(container.scrollLeft > 10);
    setShowRightShadow(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      handleScroll();
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="relative">
      {/* Left fade shadow */}
      {showLeftShadow && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#f5f3ff] to-transparent z-10 pointer-events-none" />
      )}

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth pb-1"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {categories.map((category) => {
          const isSelected = category === selectedCategory;
          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={`
                flex-shrink-0 px-4 py-2 rounded-full font-semibold text-sm transition-all duration-200
                ${
                  isSelected
                    ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-white shadow-lg scale-105'
                    : 'bg-white border-2 border-purple-200 text-gray-700 hover:border-digis-cyan hover:bg-purple-50'
                }
              `}
              aria-pressed={isSelected}
              aria-label={`Filter by ${category}`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Right fade shadow */}
      {showRightShadow && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#f5f3ff] to-transparent z-10 pointer-events-none" />
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
