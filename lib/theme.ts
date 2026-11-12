export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "weelink-theme";

/** Runs in <head> before paint so the saved or system theme never flashes. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}})()`;
