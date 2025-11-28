import { redirect } from 'next/navigation';

// Redirect /shows to /streams - "Streams" is the unified name for paid streams
export default function ShowsPage() {
  redirect('/streams');
}
