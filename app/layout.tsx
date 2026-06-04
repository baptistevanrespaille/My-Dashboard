import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "MyDashboard",
  description: "Personal life tracking dashboard",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MyDashboard",
  },
  icons: {
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0F0F0F",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans antialiased bg-[#0F0F0F] text-foreground">
        <main className="pb-nav min-h-screen max-w-lg mx-auto">
          {children}
        </main>
        <BottomNav />
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: { background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#f0f0f0" },
          }}
        />
      </body>
    </html>
  );
}
