import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Bebas_Neue, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AmbientBackground from "@/components/AmbientBackground";
import PageTransitionWrapper from "@/components/PageTransitionWrapper";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "700"],
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  display: "swap",
});

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
  themeColor: "#050508",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${bebasNeue.variable} ${jetbrainsMono.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased" style={{ background: "#050508", color: "#F0EEE8" }}>
        <AmbientBackground />
        <main className="pb-nav min-h-screen max-w-lg mx-auto relative z-10">
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>
        <BottomNav />
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(18,18,31,0.95)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#f0f0f0",
              backdropFilter: "blur(12px)",
            },
          }}
        />
      </body>
    </html>
  );
}
