import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Streams | Digis',
  description: 'Redirecting to Streams...',
};

export default function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
