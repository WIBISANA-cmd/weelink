// Captures README screenshots and the demo GIF from a running WeeLink.
// Use a production server (npm run build && npm start) so the dev overlay stays out of the shots.
//   BASE_URL=http://localhost:3000 DEMO_LINK="https://..." npm run docs:capture
import { spawnSync } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import ffmpeg from "ffmpeg-static";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DEMO_LINK = process.env.DEMO_LINK ?? "https://www.tiktok.com/@tiktok/video/7106594312292453675";
const SHOTS = "docs/screenshots";
const VIDEO_DIR = "docs/.video";

const phone = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

// Draws a fading dot where the demo taps, so the GIF shows what was pressed.
const tapMarker = () => {
  addEventListener(
    "pointerdown",
    (e) => {
      const dot = document.createElement("div");
      dot.style.cssText = `position:fixed;left:${e.clientX - 18}px;top:${e.clientY - 18}px;width:36px;height:36px;border-radius:50%;background:rgba(31,86,224,.35);pointer-events:none;z-index:99999;transition:opacity .5s,transform .5s`;
      document.body.append(dot);
      requestAnimationFrame(() => {
        dot.style.opacity = "0";
        dot.style.transform = "scale(1.6)";
      });
      setTimeout(() => dot.remove(), 600);
    },
    true,
  );
};

async function waitForResult(page) {
  await page.waitForSelector("#result-title", { timeout: 90_000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
}

async function screenshots(browser) {
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ ...phone, deviceScaleFactor: 2, colorScheme: theme });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SHOTS}/mobile-${theme}-home.png` });

    await page.fill("#link", DEMO_LINK);
    await page.click("button[type=submit]");
    await page.waitForTimeout(350);
    if (theme === "light") await page.screenshot({ path: `${SHOTS}/mobile-light-loading.png` });

    await waitForResult(page);
    await page.locator("article").screenshot({ path: `${SHOTS}/mobile-${theme}-result.png` });

    if (theme === "light") {
      await page.click("article label:has-text('MP3')");
      await page.waitForTimeout(300);
      await page.locator("article").screenshot({ path: `${SHOTS}/mobile-light-mp3.png` });

      await page.click("text=Link lain");
      await page.fill("#link", "https://www.youtube.com/watch?v=aaaaaaaaaaa");
      await page.click("button[type=submit]");
      await page.waitForSelector("text=Belum berhasil", { timeout: 90_000 });
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${SHOTS}/mobile-light-error.png` });
    }
    await ctx.close();
  }

  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.fill("#link", DEMO_LINK);
    await page.click("button[type=submit]");
    await waitForResult(page);
    await page.screenshot({ path: `${SHOTS}/desktop-${theme}.png` });
    await ctx.close();
  }

  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${SHOTS}/tablet-light-home.png` });
  await ctx.close();
}

async function demoVideo(browser) {
  await rm(VIDEO_DIR, { recursive: true, force: true });
  const ctx = await browser.newContext({
    ...phone,
    colorScheme: "light",
    permissions: ["clipboard-read", "clipboard-write"],
    recordVideo: { dir: VIDEO_DIR, size: phone.viewport },
  });
  await ctx.addInitScript(tapMarker);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate((link) => navigator.clipboard.writeText(`Lihat video ini ${link}`), DEMO_LINK);
  await page.waitForTimeout(1200);

  await page.click("button:has-text('Tempel')");
  await waitForResult(page);
  await page.waitForTimeout(1200);

  const keys = page.locator("article fieldset").last().locator("label");
  if ((await keys.count()) > 1) await keys.nth(1).click();
  await page.waitForTimeout(900);
  await page.click("article label:has-text('MP3')");
  await page.waitForTimeout(700);
  await page.click("article label:has-text('192')");
  await page.waitForTimeout(900);
  await page.click("article label:has-text('Video')");
  await page.waitForTimeout(700);

  await page.locator("article .neu-primary").click();
  await page.waitForSelector("text=Cek folder Unduhan", { timeout: 180_000 });
  await page.waitForTimeout(1600);

  await page.click("button[aria-label^='Ganti ke mode']");
  await page.waitForTimeout(1800);
  await ctx.close();

  const [webm] = (await readdir(VIDEO_DIR)).filter((f) => f.endsWith(".webm"));
  const filters = "fps=12,scale=360:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4";
  const result = spawnSync(ffmpeg, ["-y", "-i", join(VIDEO_DIR, webm), "-vf", filters, "docs/demo.gif"], { stdio: "inherit" });
  await rm(VIDEO_DIR, { recursive: true, force: true });
  if (result.status !== 0) throw new Error("ffmpeg gagal membuat GIF");
}

await mkdir(SHOTS, { recursive: true });
const browser = await chromium.launch();
try {
  await screenshots(browser);
  console.log(`Screenshot tersimpan di ${SHOTS}/`);
  await demoVideo(browser);
  console.log("GIF demo tersimpan di docs/demo.gif");
} finally {
  await browser.close();
}
