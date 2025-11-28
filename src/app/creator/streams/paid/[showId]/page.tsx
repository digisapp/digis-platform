import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ showId: string }>;
}

export default async function CreatorShowDetailRedirect({ params }: PageProps) {
  const { showId } = await params;
  redirect(`/shows/${showId}`);
}
