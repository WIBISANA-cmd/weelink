// Renders the PWA PNG icons from the W mark in public/icon.svg. Requires: npx playwright install chromium
// Replace the mark below and public/icon.svg together when the real logo arrives.
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";

const MARK = `<path d="M15 22l7 21 10-17 10 17 7-21" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`;

const roundedTile = await readFile("public/icon.svg", "utf8");
// Launchers mask these into their own shape, so the blue runs to the edge and the W stays inside the 80% safe circle.
const fullTile = svg(`<rect width="64" height="64" fill="#1f56e0"/>${MARK}`);
// Android tints notification badges from the alpha channel only.
const badge = svg(MARK);

const targets = [
  { path: "public/icons/icon-192.png", size: 192, source: roundedTile },
  { path: "public/icons/icon-512.png", size: 512, source: roundedTile },
  { path: "public/icons/maskable-192.png", size: 192, source: fullTile },
  { path: "public/icons/maskable-512.png", size: 512, source: fullTile },
  { path: "public/icons/badge-96.png", size: 96, source: badge },
  // iOS rounds the corners itself and paints transparency black, so it gets the full tile.
  { path: "app/apple-icon.png", size: 180, source: fullTile },
];

await mkdir("public/icons", { recursive: true });
const browser = await chromium.launch();
for (const { path, size, source } of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0">${source.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body>`);
  await page.screenshot({ path, omitBackground: true });
  await page.close();
  console.log(path);
}
await browser.close();
