import type { Metadata, Viewport } from "next";
import { CommunityProvider } from "../components/community-provider";
import { AppFrame } from "../components/app-frame";
import { getCommunityName } from "@/lib/community-brand";
import "./globals.css";

const communityName = getCommunityName();

export const metadata: Metadata = {
  title: communityName,
  description: "面向小区住户的社区协作平台。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body className="site-frame community-app min-h-full bg-[var(--background)] text-[var(--foreground)] antialiased">
        <CommunityProvider>
          <AppFrame>{children}</AppFrame>
        </CommunityProvider>
      </body>
    </html>
  );
}
