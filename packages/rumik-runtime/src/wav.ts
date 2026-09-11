import { readFileSync, writeFileSync } from "node:fs";

function readUInt32LE(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset);
}

function findDataChunk(buf: Buffer): { dataOffset: number; dataSize: number; fmtOffset: number } {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a WAV file");
  }
  let offset = 12;
  let fmtOffset = -1;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = readUInt32LE(buf, offset + 4);
    if (id === "fmt ") fmtOffset = offset;
    if (id === "data") {
      dataOffset = offset + 8;
      dataSize = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (fmtOffset < 0 || dataOffset < 0) throw new Error("Invalid WAV structure");
  return { dataOffset, dataSize, fmtOffset };
}

/** Concatenate PCM WAV files that share the same format into one playable file. */
export function concatWavFiles(inputPaths: string[], outputPath: string): void {
  if (!inputPaths.length) throw new Error("No WAV segments to concatenate");
  if (inputPaths.length === 1) {
    writeFileSync(outputPath, readFileSync(inputPaths[0]!));
    return;
  }

  const files = inputPaths.map((p) => readFileSync(p));
  const first = files[0]!;
  const meta = findDataChunk(first);
  const fmtSize = readUInt32LE(first, meta.fmtOffset + 4);
  const fmtChunk = first.subarray(meta.fmtOffset, meta.fmtOffset + 8 + fmtSize);

  const pcmParts: Buffer[] = [];
  let totalPcm = 0;
  for (const file of files) {
    const chunk = findDataChunk(file);
    const pcm = file.subarray(chunk.dataOffset, chunk.dataOffset + chunk.dataSize);
    pcmParts.push(pcm);
    totalPcm += pcm.length;
  }

  const header = Buffer.alloc(12 + fmtChunk.length + 8);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + totalPcm, 4);
  header.write("WAVE", 8);
  fmtChunk.copy(header, 12);
  const dataHeaderOffset = 12 + fmtChunk.length;
  header.write("data", dataHeaderOffset);
  header.writeUInt32LE(totalPcm, dataHeaderOffset + 4);
  // Fix RIFF size for variable fmt chunk length
  header.writeUInt32LE(4 + fmtChunk.length + 8 + totalPcm, 4);

  writeFileSync(outputPath, Buffer.concat([header, ...pcmParts]));
}
