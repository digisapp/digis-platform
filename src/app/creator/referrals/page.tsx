'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReferralsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/creator/earn');
  }, [router]);

  return null;
}
