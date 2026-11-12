import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WeeLink",
    short_name: "WeeLink",
    description: "Simpan video, gambar, atau MP3 dari link postingan publik.",
    lang: "id",
    start_url: "/",
    display: "standalone",
    background_color: "#e3e8f0",
    theme_color: "#e3e8f0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    // Lets Android list WeeLink in the share sheet; the link arrives as ?text= or ?url=.
    share_target: {
      action: "/",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
