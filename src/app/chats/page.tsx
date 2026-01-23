'use client';

import { MessageCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChatsSidebar } from '@/components/chats/ChatsSidebar';

export default function ChatsPage() {
  const router = useRouter();

  return (
    <>
      {/* Mobile: Show sidebar in main content area */}
      <div className="lg:hidden flex flex-col h-full">
        <ChatsSidebar />
      </div>

      {/* Desktop: Show placeholder (sidebar is in layout) */}
      <div className="hidden lg:flex flex-col backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl border-2 border-cyan-500/30 h-full shadow-[0_0_50px_rgba(34,211,238,0.3)] overflow-hidden">
        <div className="flex items-center justify-center h-full p-12">
          <div className="text-center max-w-md">
            <MessageCircle className="w-24 h-24 mx-auto mb-6 text-cyan-400" />
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-4">
              Select a Chat
            </h2>
            <p className="text-gray-400 mb-6">Choose a conversation from the left or start a new one</p>
          </div>
        </div>
      </div>
    </>
  );
}
