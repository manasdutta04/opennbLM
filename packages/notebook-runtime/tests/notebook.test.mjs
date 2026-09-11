import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chunkText, extractPlainText } from "../dist/index.js";
import JSZip from "jszip";

test("chunkText splits long material into word windows", () => {
  const words = Array.from({ length: 1200 }, (_, i) => `w${i}`).join(" ");
  const chunks = chunkText(words, 500);
  assert.equal(chunks.length, 3);
  assert.ok(chunks[0].includes("w0"));
  assert.ok(chunks[2].includes("w1100"));
});

test("chunkText returns empty for blank input", () => {
  assert.deepEqual(chunkText("   "), []);
});

test("extractPlainText reads markdown and docx", async () => {
  const dir = mkdtempSync(join(tmpdir(), "opennblm-nb-"));
  const mdPath = join(dir, "notes.md");
  writeFileSync(mdPath, "# Hello\n\nPhotosynthesis converts light into chemical energy.");
  const md = await extractPlainText(mdPath);
  assert.equal(md.kind, "text");
  assert.match(md.text, /Photosynthesis/);

  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>DOCX photosynthesis excerpt</w:t></w:r></w:p></w:body></w:document>`,
  );
  const docxPath = join(dir, "notes.docx");
  writeFileSync(docxPath, await zip.generateAsync({ type: "nodebuffer" }));
  const docx = await extractPlainText(docxPath);
  assert.equal(docx.kind, "docx");
  assert.match(docx.text, /DOCX photosynthesis/);

  const pptxZip = new JSZip();
  pptxZip.file(
    "ppt/slides/slide1.xml",
    `<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>PPTX mitosis overview</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
  );
  const pptxPath = join(dir, "deck.pptx");
  writeFileSync(pptxPath, await pptxZip.generateAsync({ type: "nodebuffer" }));
  const pptx = await extractPlainText(pptxPath);
  assert.equal(pptx.kind, "pptx");
  assert.match(pptx.text, /PPTX mitosis/);
});
