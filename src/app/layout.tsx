
import type { Metadata } from "next";
import { SiteNav } from "../components/site-nav";
import { CommunityProvider } from "../components/community-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "邻里圈",
  description: "部署在 Vercel、数据库接入 Supabase 的小区社区网站。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-full bg-slate-50 text-slate-900">
        <CommunityProvider>
          <div className="flex min-h-screen flex-col">
            <SiteNav />
            <div className="flex-1">{children}</div>
          </div>
        </CommunityProvider>
      </body>
    </html>
  );
}
