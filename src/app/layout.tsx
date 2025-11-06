import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
