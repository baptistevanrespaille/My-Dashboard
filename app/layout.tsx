import type { Metadata, Viewport } from "next";
import { Syne, Space_Grotesk } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import CircuitBackground from "@/components/CircuitBackground";
import PageTransitionWrapper from "@/components/PageTransitionWrapper";
import { Toaster } from "sonner";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
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
  themeColor: "#030305",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${syne.variable} ${spaceGrotesk.variable}`}>
      <body
        className="antialiased"
        style={{ background: "#030305", color: "#F8F8FF", fontFamily: "var(--font-space), system-ui, sans-serif" }}
      >
        <CircuitBackground />
        <main className="pb-nav min-h-screen max-w-lg mx-auto relative z-10">
          <PageTransitionWrapper>{children}</PageTransitionWrapper>
        </main>
        <BottomNav />
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(13,13,26,0.98)",
              border: "1px solid rgba(99,102,241,0.2)",
              color: "#F8F8FF",
              backdropFilter: "blur(16px)",
              fontFamily: "var(--font-space)",
            },
          }}
        />
      </body>
    </html>
  );
}
