'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ShareRewardsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/creator/earn');
  }, [router]);

  return null;
}
