// Renders the PWA PNG icons from public/icon.svg. Requires: npx playwright install chromium
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";

const svg = await readFile("public/icon.svg", "utf8");
await mkdir("public/icons", { recursive: true });

const browser = await chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body>`);
  await page.screenshot({ path: `public/icons/icon-${size}.png`, omitBackground: true });
  await page.close();
  console.log(`public/icons/icon-${size}.png`);
}
await browser.close();
