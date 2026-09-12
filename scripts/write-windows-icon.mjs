import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcPng = join(root, "packaging/icons/icon.png");
const destIco = join(root, "packaging/icons/icon.ico");
const destDesktop = join(root, "apps/desktop/icon.ico");
const sizes = [16, 24, 32, 48, 64, 128, 256];
const work = join(tmpdir(), "opennblm-ico");
mkdirSync(work, { recursive: true });

const ps1 = join(work, "resize.ps1");
writeFileSync(
  ps1,
  `
param($Src, $OutDir)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile($Src)
foreach ($s in @(16, 24, 32, 48, 64, 128, 256)) {
  $bmp = New-Object System.Drawing.Bitmap $s, $s
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($src, 0, 0, $s, $s)
  $bmp.Save((Join-Path $OutDir ("icon-{0}.png" -f $s)), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}
$src.Dispose()
`,
);

execFileSync(
  "powershell.exe",
  ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-File", ps1, srcPng, work],
  { stdio: "inherit" },
);

const images = sizes.map((size) => ({ size, png: readFileSync(join(work, `icon-${size}.png`)) }));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);

let offset = 6 + images.length * 16;
const entries = [];
const blobs = [];
for (const image of images) {
  const entry = Buffer.alloc(16);
  entry[0] = image.size >= 256 ? 0 : image.size;
  entry[1] = image.size >= 256 ? 0 : image.size;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(image.png.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += image.png.length;
  entries.push(entry);
  blobs.push(image.png);
}

writeFileSync(destIco, Buffer.concat([header, ...entries, ...blobs]));
copyFileSync(destIco, destDesktop);
console.log(`wrote ${destIco} and ${destDesktop} (${images.length} sizes)`);
