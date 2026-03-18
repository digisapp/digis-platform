'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
