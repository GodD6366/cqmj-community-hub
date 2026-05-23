import type { Metadata } from "next";
import { CommunityProvider } from "../components/community-provider";
import { AppFrame } from "../components/app-frame";
import "./globals.css";

export const metadata: Metadata = {
  title: "邻里圈",
  description: "面向小区住户的社区协作平台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body className="site-frame min-h-full bg-[var(--background)] text-[var(--foreground)] antialiased">
        <CommunityProvider>
          <AppFrame>{children}</AppFrame>
        </CommunityProvider>
      </body>
    </html>
  );
}
