import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthNavGate } from "@/components/layout/AuthNavGate";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { IncomingCallPopupLazy } from "@/components/calls/IncomingCallPopupLazy";
import { Analytics } from "@vercel/analytics/next";
import { PageTracker } from "@/components/analytics/PageTracker";
import { OrganizationJsonLd } from "@/components/seo/JsonLd";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Digis - Live Creator Platform",
    template: "%s | Digis",
  },
  description: "Connect with your favorite creators through video calls, live streams, and exclusive content on Digis - the ultimate creator platform.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/iphone-logo.png",
    apple: "/icons/iphone-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Digis",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  metadataBase: new URL("https://digis.cc"),
  openGraph: {
    title: "Digis - Live Creator Platform",
    description: "Connect with your favorite creators through video calls, live streams, and exclusive content.",
    url: "https://digis.cc",
    siteName: "Digis",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/digis-logo-white.png",
        width: 1200,
        height: 630,
        alt: "Digis - Live Creator Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Digis - Live Creator Platform",
    description: "Connect with your favorite creators through video calls, live streams, and exclusive content.",
    images: ["/images/digis-logo-white.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`bg-black ${poppins.variable}`}>
      <head>
        <OrganizationJsonLd
          name="Digis"
          url="https://digis.cc"
          logo="https://digis.cc/images/digis-logo-white.png"
          description="Connect with your favorite creators through video calls, live streams, and exclusive content."
        />
      </head>
      <body className="antialiased bg-black min-h-screen">
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              <PageTracker />
              <AuthNavGate />
              <IncomingCallPopupLazy />
              {children}
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
