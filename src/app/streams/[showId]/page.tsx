import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ showId: string }>;
}

// Redirect /streams/[showId] to /shows/[showId] for now
// The /shows/[showId] page handles the actual stream detail view
export default async function StreamDetailRedirect({ params }: PageProps) {
  const { showId } = await params;
  redirect(`/shows/${showId}`);
}
