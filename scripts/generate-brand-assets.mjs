import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const projectConfig = path.join(root, "src/config/project.config.ts");
const publicDir = path.join(root, "public");
const appFavicon = path.join(root, "src/app/favicon.ico");

async function getBrandMarkSource() {
  if (process.env.BRAND_MARK_SOURCE) return process.env.BRAND_MARK_SOURCE;

  const config = await readFile(projectConfig, "utf8");
  const match = config.match(/mark:\s*\{\s*src:\s*["']([^"']+)["']/);
  if (!match) {
    throw new Error("Could not find brand.mark.src in src/config/project.config.ts. Set BRAND_MARK_SOURCE to override.");
  }

  return match[1];
}

const pngTargets = [
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
  ["favicon-48x48.png", 48],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
];

function buildIco(images) {
  const headerSize = 6;
  const entrySize = 16;
  const directorySize = headerSize + images.length * entrySize;
  const header = Buffer.alloc(directorySize);

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = directorySize;
  images.forEach(({ size, buffer }, index) => {
    const entryOffset = headerSize + index * entrySize;
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset);
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(buffer.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += buffer.length;
  });

  return Buffer.concat([header, ...images.map(({ buffer }) => buffer)]);
}

await mkdir(publicDir, { recursive: true });

const brandMarkSource = await getBrandMarkSource();
const source = path.join(root, brandMarkSource.replace(/^\//, "public/"));
const svg = await readFile(source);
await writeFile(path.join(publicDir, "favicon.svg"), svg);

const icoImages = [];

for (const [fileName, size] of pngTargets) {
  const buffer = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain" })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(path.join(publicDir, fileName), buffer);

  if ([16, 32, 48].includes(size)) {
    icoImages.push({ size, buffer });
  }
}

const ico = buildIco(icoImages);
await writeFile(path.join(publicDir, "favicon.ico"), ico);
await writeFile(appFavicon, ico);

console.log(`Generated favicon and web icon assets from ${brandMarkSource}`);
