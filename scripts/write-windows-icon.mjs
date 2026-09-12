import { readFileSync, writeFileSync } from "node:fs";

const png = readFileSync("packaging/icons/icon.png");
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry[0] = 0;
entry[1] = 0;
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(22, 12);
writeFileSync("packaging/icons/icon.ico", Buffer.concat([header, entry, png]));
console.log(`wrote packaging/icons/icon.ico (${png.length} png bytes)`);
