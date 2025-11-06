import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { processStripePayment, reconcileWallets } from '@/lib/inngest/functions';

// Serve Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processStripePayment,
    reconcileWallets,
  ],
});
