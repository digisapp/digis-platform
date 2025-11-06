'use client';

import { use } from 'react';
import { VideoCall } from '@/components/calls/VideoCall';

export default function CallPage({ params }: { params: Promise<{ callId: string }> }) {
  const { callId } = use(params);

  return <VideoCall callId={callId} />;
}
