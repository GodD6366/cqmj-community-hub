import type { Metadata, Viewport } from "next";
import { CommunityProvider } from "@/lib/community-store";
import { AppFrame } from "@/components/layout/app-frame";
import { getCommunityName } from "@/lib/community-brand";
import "./globals.css";

const communityName = getCommunityName();

export const metadata: Metadata = {
  title: communityName,
  description: "面向小区住户的社区协作平台。",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body className="min-h-screen antialiased">
        <CommunityProvider>
          <AppFrame>{children}</AppFrame>
        </CommunityProvider>
      </body>
    </html>
  );
}
