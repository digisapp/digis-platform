import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/layout/Navigation";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { IncomingCallPopup } from "@/components/calls/IncomingCallPopup";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/next";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Digis - Live Creator Platform",
  description: "Connect with your favorite creators through video calls, live streams, and exclusive content",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`bg-black ${poppins.variable}`}>
      <body className="antialiased bg-black min-h-screen">
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              <Navigation />
              <IncomingCallPopup />
              {children}
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
