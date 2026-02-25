import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Digis, the live creator platform. Read our terms and conditions for using the platform.',
  openGraph: {
    title: 'Terms of Service | Digis',
    description: 'Terms of Service for Digis, the live creator platform.',
    url: 'https://digis.cc/terms',
    siteName: 'Digis',
    type: 'website',
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
