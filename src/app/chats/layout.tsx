'use client';

import { MobileHeader } from '@/components/layout/MobileHeader';
import { ChatsSidebar } from '@/components/chats/ChatsSidebar';

export default function ChatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Mobile Header with Logo */}
      <MobileHeader />

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="px-4 pt-2 md:pt-10">
          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,400px)_1fr] gap-6">
            {/* Left Column: Conversations Sidebar - hidden on mobile when viewing a chat */}
            <div className="hidden lg:flex flex-col h-[calc(100vh-140px)]">
              <ChatsSidebar />
            </div>

            {/* Right Column: Chat Content */}
            <div className="flex flex-col h-[calc(100dvh-140px)] md:h-[calc(100vh-140px)]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
