import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RailMind - Railway Operations Intelligence",
  description: "AI-Powered Railway operations control and cascade resolution dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-row bg-[#0a0e1a] text-[#f9fafb] antialiased`}
      >
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-y-auto bg-[#0a0e1a] pl-[240px]">
          {children}
        </main>
        <Toaster 
          richColors 
          position="top-right" 
          theme="dark" 
          toastOptions={{
            className: 'bg-surface-2 border border-railmind-border text-white shadow-xl shadow-black/40',
          }}
        />
      </body>
    </html>
  );
}

