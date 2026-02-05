import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Sidebar } from "@/components/sidebar";
import { AuthGate } from "@/components/auth-gate";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevTools - CrowdCount",
  description: "Developer panel for CrowdCount API management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.cdnfonts.com/css/sf-pro-display" rel="stylesheet" />
      </head>
      <body
        className={`${geistMono.variable} antialiased`}
      >
        <Providers>
          <AuthGate>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto bg-background p-8">
                {children}
              </main>
            </div>
          </AuthGate>
        </Providers>
      </body>
    </html>
  );
}
