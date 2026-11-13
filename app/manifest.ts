import type { MetadataRoute } from "next";
import { SURFACE } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "WeeLink",
    short_name: "WeeLink",
    description: "Simpan video, gambar, atau MP3 dari link postingan publik.",
    lang: "id",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // On desktop the app draws its own title bar (see .titlebar in globals.css).
    display_override: ["window-controls-overlay", "standalone"],
    background_color: SURFACE.light,
    theme_color: SURFACE.light,
    categories: ["utilities", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    // Shown by Android and desktop Chrome in the richer install dialog. Captured from the app itself.
    screenshots: [
      {
        src: "/screenshots/narrow-home.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "Layar Unduh: tempel link postingan",
      },
      {
        src: "/screenshots/narrow-result.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "Pilih format dan kualitas, lalu simpan",
      },
      {
        src: "/screenshots/wide-home.png",
        sizes: "1440x900",
        type: "image/png",
        form_factor: "wide",
        label: "WeeLink sebagai aplikasi desktop",
      },
    ],
    shortcuts: [
      {
        name: "Riwayat",
        short_name: "Riwayat",
        description: "Link yang pernah dibaca di perangkat ini",
        url: "/riwayat",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Pengaturan",
        short_name: "Pengaturan",
        url: "/pengaturan",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    // Lets Android list WeeLink in the share sheet; the link arrives as ?text= or ?url=.
    share_target: {
      action: "/",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
    // A link shared while WeeLink is already open lands in that window instead of a second one.
    launch_handler: { client_mode: ["navigate-existing", "auto"] },
  };
}
