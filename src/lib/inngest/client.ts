import { Inngest } from 'inngest';

// Create an Inngest client
export const inngest = new Inngest({
  id: 'digis-app',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
