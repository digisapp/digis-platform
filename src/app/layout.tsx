import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/layout/Navigation";

export const metadata: Metadata = {
  title: "Digis - Creator Economy Platform",
  description: "Connect with your favorite creators through video calls, live streams, and exclusive content",
  icons: {
    icon: "/favicon.ico",
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
        <Navigation />
        {children}
      </body>
    </html>
  );
}
