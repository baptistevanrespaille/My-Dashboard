import type { Metadata, Viewport } from "next";
import { Orbitron, Space_Grotesk } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import PageTransitionWrapper from "@/components/PageTransitionWrapper";
import { Toaster } from "sonner";

const VideoBackground = dynamic(() => import("@/components/VideoBackground"), { ssr: false });

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space",
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
    apple: [{ url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${orbitron.variable} ${spaceGrotesk.variable}`}>
      <body
        className="antialiased"
        style={{ background: "#000000", color: "#FFFFFF", fontFamily: "var(--font-space), system-ui, sans-serif" }}
      >
        <VideoBackground />
        <main className="pb-nav min-h-screen max-w-lg mx-auto relative z-10">
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>
        <BottomNav />
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(0,0,0,0.92)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#FFFFFF",
              backdropFilter: "blur(16px)",
              fontFamily: "var(--font-space)",
            },
          }}
        />
      </body>
    </html>
  );
}
