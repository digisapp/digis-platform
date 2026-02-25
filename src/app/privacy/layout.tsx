import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Digis. Learn how we collect, use, and protect your personal data on our live creator platform.',
  openGraph: {
    title: 'Privacy Policy | Digis',
    description: 'Privacy Policy for Digis. Learn how we handle your data.',
    url: 'https://digis.cc/privacy',
    siteName: 'Digis',
    type: 'website',
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
