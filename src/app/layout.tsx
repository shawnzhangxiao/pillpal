import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "小贝壳 · 每日服药提醒",
  description: "为小公主的到来做好准备",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "小贝壳",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="ocean-gradient min-h-screen text-gray-700 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
