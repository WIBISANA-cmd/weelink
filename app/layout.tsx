import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppShell } from "@/components/app/app-shell";
import { PwaRuntime } from "@/components/pwa/pwa-runtime";
import { SplashScreen } from "@/components/pwa/splash-screen";
import { Toaster } from "@/components/pwa/toaster";
import { bootScript } from "@/lib/pwa";
import { SURFACE, themeScript } from "@/lib/theme";
import "./globals.css";

// Made in Jakarta by Tokotype; its rounded geometry suits soft extruded surfaces.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WeeLink: simpan video, foto, dan MP3 dari link sosmed",
    template: "%s · WeeLink",
  },
  description:
    "Tempel link postingan publik dari Instagram, TikTok, Threads, YouTube, dan situs lain, lalu simpan video, gambar, atau MP3 dengan kualitas pilihanmu. Tanpa akun.",
  applicationName: "WeeLink",
  appleWebApp: {
    capable: true,
    title: "WeeLink",
    statusBarStyle: "default",
  },
  // Durations and sizes like "1080" must not turn into phone links on iOS.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: SURFACE.light },
    { media: "(prefers-color-scheme: dark)", color: SURFACE.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" data-theme="light" suppressHydrationWarning className={jakarta.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <SplashScreen />
        <a
          href="#main"
          className="neu-btn sr-only px-4 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Langsung ke isi
        </a>
        <AppShell>{children}</AppShell>
        <Toaster />
        <PwaRuntime />
      </body>
    </html>
  );
}
