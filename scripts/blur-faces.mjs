// Softens the children's faces in the demo photo before it is uploaded in the pitch video.
//   node scripts/blur-faces.mjs demo/package.jpg demo/package-blur.jpg
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
// Face areas as [centre x, centre y, half width, half height] in a 1600 x 1200 photo.
const FACES = [
  [115, 540, 105, 120],
  [385, 440, 125, 140],
  [815, 410, 125, 140],
  [1490, 530, 125, 150],
];

const browser = await chromium.launch();
const page = await browser.newPage();
const data = `data:image/jpeg;base64,${readFileSync(input).toString("base64")}`;
const url = await page.evaluate(
  async ([src, faces]) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const k = img.width / 1600;
    for (const [x, y, rx, ry] of faces) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x * k, y * k, rx * k, ry * k, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.filter = `blur(${Math.round(14 * k)}px)`;
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
    return c.toDataURL("image/jpeg", 0.9);
  },
  [data, FACES],
);
writeFileSync(output, Buffer.from(url.split(",")[1], "base64"));
await browser.close();
console.log("wrote", output);
