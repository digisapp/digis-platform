import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/layout/Navigation";
import { AuthProvider } from "@/context/AuthContext";
import { IncomingCallPopup } from "@/components/calls/IncomingCallPopup";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Digis - Creator Economy Platform",
  description: "Connect with your favorite creators through video calls, live streams, and exclusive content",
  icons: {
    icon: "/images/digis-logo-white.png",
    apple: "/images/digis-logo-white.png",
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
        <AuthProvider>
          <Navigation />
          <IncomingCallPopup />
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
