import type { Metadata } from "next";
import { SiteNav } from "../components/site-nav";
import { CommunityProvider } from "../components/community-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "邻里圈",
  description: "用社区公告板的方式组织求助、闲置、讨论和治理信息的小区站点。",
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
          <div className="flex min-h-screen flex-col">
            <SiteNav />
            <div className="flex-1 pb-8 sm:pb-10">{children}</div>
          </div>
        </CommunityProvider>
      </body>
    </html>
  );
}
