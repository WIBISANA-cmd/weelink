import { settingsStore } from "./settings";

export type NotifySupport = "supported" | "needs-install" | "unsupported";

/** iPhone browsers only expose notifications to apps added to the Home Screen. */
export function notifySupport(ios: boolean, standalone: boolean): NotifySupport {
  if (typeof Notification !== "undefined" && "serviceWorker" in navigator) return "supported";
  return ios && !standalone ? "needs-install" : "unsupported";
}

/** Only while WeeLink is out of sight: if the user is looking, the Save button already says it's done. */
export async function notifyFileReady(filename: string) {
  if (!settingsStore.get().notify || document.visibilityState === "visible") return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  const options: NotificationOptions = {
    body: `${filename} tersimpan di folder Unduhan.`,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: "weelink-download",
    lang: "id",
  };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) await registration.showNotification("File siap", options);
    else new Notification("File siap", options);
  } catch (error) {
    console.error(error);
  }
}
