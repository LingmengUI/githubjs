import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from 'next/script';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GitHub 文件加速下载服务",
  description: "快速、稳定的 GitHub 文件下载加速服务",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 从环境变量获取域名
  const isDevelopment = process.env.NODE_ENV === 'development';
  const baseUrl = isDevelopment ? '' : process.env.NEXT_PUBLIC_DOMAIN || '';

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Script id="dynamic-base">
          {`
            window.__NEXT_PUBLIC_BASE_URL__ = "${baseUrl}";
            // 动态处理资源路径
            (function() {
              var originalFetch = window.fetch;
              window.fetch = function(url, options) {
                if (url.startsWith('/_next/') || url.startsWith('/static/')) {
                  url = window.__NEXT_PUBLIC_BASE_URL__ + url;
                }
                return originalFetch.call(this, url, options);
              };
            })();
          `}
        </Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
