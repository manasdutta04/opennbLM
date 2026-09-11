/** Chunk text into ~500-word segments for retrieval. */
export function chunkText(text: string, targetWords = 500): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const words = normalized.split(" ");
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += targetWords) {
    const slice = words.slice(i, i + targetWords).join(" ").trim();
    if (slice) chunks.push(slice);
  }
  return chunks;
}

export async function extractPlainText(filePath: string): Promise<{ kind: "pdf" | "pptx" | "docx" | "text"; text: string; title: string }> {
  const { basename, extname } = await import("node:path");
  const { readFileSync } = await import("node:fs");
  const ext = extname(filePath).toLowerCase();
  const title = basename(filePath);

  if (ext === ".pdf") {
    const pdfParse = (await import("pdf-parse")).default as (buf: Buffer) => Promise<{ text: string }>;
    const parsed = await pdfParse(readFileSync(filePath));
    return { kind: "pdf", text: parsed.text || "", title };
  }

  if (ext === ".txt" || ext === ".md" || ext === ".markdown" || ext === ".html" || ext === ".htm") {
    return { kind: "text", text: readFileSync(filePath, "utf8"), title };
  }

  if (ext === ".docx") {
    // Minimal DOCX: word/document.xml text nodes (no heavy dependency).
    const { unzipSync } = await import("node:zlib");
    void unzipSync;
    const JSZip = await loadOptionalZip();
    if (!JSZip) throw new Error("DOCX support requires the app rebuild with zip utilities; paste text or use PDF for now.");
    const zip = await JSZip.loadAsync(readFileSync(filePath));
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) throw new Error("Invalid DOCX file");
    const text = xml
      .replace(/<w:p[^>]*>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return { kind: "docx", text, title };
  }

  if (ext === ".pptx") {
    const JSZip = await loadOptionalZip();
    if (!JSZip) throw new Error("PPTX support requires zip utilities; export slides to PDF or paste text.");
    const zip = await JSZip.loadAsync(readFileSync(filePath));
    const slides: string[] = [];
    for (const [name, file] of Object.entries(zip.files)) {
      if (!/^ppt\/slides\/slide\d+\.xml$/i.test(name) || file.dir) continue;
      const xml = await file.async("string");
      const text = xml
        .replace(/<a:p[^>]*>/g, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) slides.push(text);
    }
    return { kind: "pptx", text: slides.join("\n\n"), title };
  }

  throw new Error(`Unsupported file type: ${ext || "unknown"}`);
}

async function loadOptionalZip(): Promise<{
  loadAsync: (data: Buffer) => Promise<{
    file: (name: string) => { async: (type: string) => Promise<string> } | null;
    files: Record<string, { dir: boolean; async: (type: string) => Promise<string> }>;
  }>;
} | null> {
  try {
    const mod = await import("jszip");
    return (mod.default || mod) as never;
  } catch {
    return null;
  }
}

export async function fetchUrlText(url: string): Promise<{ title: string; text: string; kind: "url" | "youtube" }> {
  const parsed = new URL(url);
  const youtubeId = extractYouTubeId(parsed);
  if (youtubeId) {
    const transcript = await fetchYouTubeTranscript(youtubeId);
    return {
      kind: "youtube",
      title: `YouTube ${youtubeId}`,
      text: transcript || `YouTube video ${youtubeId}. Captions were unavailable; add a pasted transcript as a text source for best results.`,
    };
  }

  const response = await fetch(url, {
    headers: { "User-Agent": "opennbLM/0.1 (local research companion)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Failed to fetch URL (${response.status})`);
  const contentType = response.headers.get("content-type") || "";
  const buf = Buffer.from(await response.arrayBuffer());
  if (contentType.includes("pdf") || parsed.pathname.toLowerCase().endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default as (buf: Buffer) => Promise<{ text: string }>;
    const parsedPdf = await pdfParse(buf);
    return { kind: "url", title: parsed.hostname + parsed.pathname, text: parsedPdf.text || "" };
  }
  const html = buf.toString("utf8");
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || parsed.hostname;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { kind: "url", title, text };
}

function extractYouTubeId(url: URL): string | null {
  if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0] || null;
  if (url.hostname.includes("youtube.com")) return url.searchParams.get("v");
  return null;
}

async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  // Best-effort timedtext endpoint; may be empty depending on region/captions.
  try {
    const list = await fetch(
      `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(videoId)}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    const xml = await list.text();
    const lang = xml.match(/lang_code="([^"]+)"/)?.[1] || "en";
    const track = await fetch(
      `https://www.youtube.com/api/timedtext?lang=${encodeURIComponent(lang)}&v=${encodeURIComponent(videoId)}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    const body = await track.text();
    return body
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}
