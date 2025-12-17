import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/layout/Navigation";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { IncomingCallPopup } from "@/components/calls/IncomingCallPopup";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Digis - Creator Economy Platform",
  description: "Connect with your favorite creators through video calls, live streams, and exclusive content",
  icons: {
    icon: "/images/digis-logo-white.png",
    apple: "/images/digis-logo-white.png",
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
    <html lang="en" className="bg-black">
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
