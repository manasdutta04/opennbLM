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

function readPcmLayout(buf: Buffer, fmtOffset: number): { sampleRate: number; channels: number; bitsPerSample: number; blockAlign: number } {
  const channels = buf.readUInt16LE(fmtOffset + 10);
  const sampleRate = buf.readUInt32LE(fmtOffset + 12);
  const blockAlign = buf.readUInt16LE(fmtOffset + 20);
  const bitsPerSample = buf.readUInt16LE(fmtOffset + 22);
  return { sampleRate, channels, bitsPerSample, blockAlign };
}

function silencePcm(ms: number, sampleRate: number, blockAlign: number): Buffer {
  const frames = Math.max(0, Math.round((sampleRate * ms) / 1000));
  return Buffer.alloc(frames * blockAlign);
}

export type ConcatWavOptions = {
  /** Milliseconds of silence between segments (reduces cracked speaker handoffs). */
  gapMs?: number;
};

/** Concatenate PCM WAV files that share the same format into one playable file. */
export function concatWavFiles(inputPaths: string[], outputPath: string, options?: ConcatWavOptions): void {
  if (!inputPaths.length) throw new Error("No WAV segments to concatenate");
  if (inputPaths.length === 1) {
    writeFileSync(outputPath, readFileSync(inputPaths[0]!));
    return;
  }

  const gapMs = Math.max(0, options?.gapMs ?? 0);
  const files = inputPaths.map((p) => readFileSync(p));
  const first = files[0]!;
  const meta = findDataChunk(first);
  const fmtSize = readUInt32LE(first, meta.fmtOffset + 4);
  const fmtChunk = first.subarray(meta.fmtOffset, meta.fmtOffset + 8 + fmtSize);
  const layout = readPcmLayout(first, meta.fmtOffset);
  const gap = gapMs > 0 ? silencePcm(gapMs, layout.sampleRate, layout.blockAlign) : null;

  const pcmParts: Buffer[] = [];
  let totalPcm = 0;
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i]!;
    const chunk = findDataChunk(file);
    const other = readPcmLayout(file, chunk.fmtOffset);
    if (other.sampleRate !== layout.sampleRate || other.channels !== layout.channels || other.bitsPerSample !== layout.bitsPerSample) {
      throw new Error("WAV segment format mismatch; cannot concatenate");
    }
    if (i > 0 && gap && gap.length) {
      pcmParts.push(gap);
      totalPcm += gap.length;
    }
    const pcm = file.subarray(chunk.dataOffset, chunk.dataOffset + chunk.dataSize);
    pcmParts.push(pcm);
    totalPcm += pcm.length;
  }

  const header = Buffer.alloc(12 + fmtChunk.length + 8);
  header.write("RIFF", 0);
  header.write("WAVE", 8);
  fmtChunk.copy(header, 12);
  const dataHeaderOffset = 12 + fmtChunk.length;
  header.write("data", dataHeaderOffset);
  header.writeUInt32LE(totalPcm, dataHeaderOffset + 4);
  header.writeUInt32LE(4 + fmtChunk.length + 8 + totalPcm, 4);

  writeFileSync(outputPath, Buffer.concat([header, ...pcmParts]));
}
