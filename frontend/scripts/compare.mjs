// Comparação visual contra screenshots de referência (exportações Figma @2x).
// Uso: npm run compare -- <frame> [largura] [url]
// Referências: design/<frame>.png | Resultados: design/out/*-{current,diff}.png
import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "node:fs";

const [name, widthArg = "1440", urlArg = "http://localhost:3000"] = process.argv.slice(2);
if (!name) {
  console.error("Usage: node scripts/compare.mjs <frame-name> [width] [url]");
  process.exit(1);
}

const width = Number(widthArg);
const refPath = `design/${name}.png`;
const outDir = "design/out";
fs.mkdirSync(outDir, { recursive: true });

if (!fs.existsSync(refPath)) {
  console.error(`Reference not found: ${refPath}`);
  console.error("Exporta o frame do Figma como PNG @2x para design/ antes de correr o compare.");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height: 900 },
  deviceScaleFactor: 2,
});
await page.goto(urlArg, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/${name}-current.png`, fullPage: true });
await browser.close();

const ref = PNG.sync.read(fs.readFileSync(refPath));
const cur = PNG.sync.read(fs.readFileSync(`${outDir}/${name}-current.png`));

const w = Math.min(ref.width, cur.width);
const h = Math.min(ref.height, cur.height);

const crop = (img) => {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(img, out, 0, 0, w, h, 0, 0);
  return out;
};

const a = crop(ref);
const b = crop(cur);
const diff = new PNG({ width: w, height: h });

const mismatched = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1 });
fs.writeFileSync(`${outDir}/${name}-diff.png`, PNG.sync.write(diff));

const pct = ((mismatched / (w * h)) * 100).toFixed(2);
console.log(`Reference: ${ref.width}x${ref.height} | Current: ${cur.width}x${cur.height}`);
console.log(`Mismatched pixels: ${mismatched} (${pct}%)`);
console.log(`Diff image: ${outDir}/${name}-diff.png`);
if (ref.height !== cur.height) {
  console.log(
    `Height differs by ${Math.abs(ref.height - cur.height)}px: check vertical spacing and section heights.`,
  );
}
