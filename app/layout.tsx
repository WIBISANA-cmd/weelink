import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { themeScript } from "@/lib/theme";
import "./globals.css";

// Made in Jakarta by Tokotype; its rounded geometry suits soft extruded surfaces.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WeeLink: simpan video, foto, dan MP3 dari link sosmed",
  description:
    "Tempel link postingan publik dari Instagram, TikTok, Threads, YouTube, dan situs lain, lalu simpan video, gambar, atau MP3 dengan kualitas pilihanmu. Tanpa akun.",
  applicationName: "WeeLink",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e3e8f0" },
    { media: "(prefers-color-scheme: dark)", color: "#1e2430" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" data-theme="light" suppressHydrationWarning className={jakarta.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <a
          href="#main"
          className="neu-btn sr-only px-4 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Langsung ke isi
        </a>
        {children}
      </body>
    </html>
  );
}
