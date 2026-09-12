import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildPodcastScriptPrompt,
  buildPodcastSystemPrompt,
  buildStudioArtifactPrompt,
  chunkText,
  extractPlainText,
  parseGuideResponse,
  parseStudioJson,
  parsePodcastScript,
  sanitizeSpokenText,
  trimPodcastTurns,
  utterancesFromPodcastTurns,
} from "../dist/index.js";
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

test("extractPlainText reads markdown, docx, and pptx", async () => {
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

test("podcast prompt encodes word budgets and teaching tone rules", () => {
  const prompt = buildPodcastScriptPrompt("AES encrypts blocks", ["Ira", "Aisha"], {
    format: "brief",
    length: "shorter",
    language: "Hindi",
    focusPrompt: "exam revision",
  });
  assert.match(prompt, /300–400 words/);
  assert.match(prompt, /WORD LIMIT/);
  assert.match(prompt, /COMPLETE sentences/);
  assert.match(prompt, /exam revision/);
  assert.match(prompt, /SpeakerName \[tone\]: dialogue/);
  assert.match(prompt, /excited, professional/);
  assert.match(prompt, /NEVER include <laugh>/);
  assert.match(prompt, /Default to excited/);
  assert.match(prompt, /STRUCTURE for The Brief/);
});

test("debate prompt assigns challenger vs advocate roles", () => {
  const prompt = buildPodcastScriptPrompt("AES encrypts blocks", ["Ira", "Aisha"], {
    format: "debate",
    length: "default",
  });
  assert.match(prompt, /Challenger/);
  assert.match(prompt, /Advocate/);
  assert.match(prompt, /Ira \(Challenger\) speaks \[professional\]/);
  assert.match(prompt, /Aisha \(Advocate\) speaks \[excited\]/);
  assert.match(prompt, /question→answer/);
  assert.match(prompt, /STRICT alternation/);
  assert.match(prompt, /STRUCTURE for The Debate/);
  const system = buildPodcastSystemPrompt("debate");
  assert.match(system, /Challenger/);
  assert.match(system, /Advocate/);
});

test("deep dive and critique prompts have distinct structures", () => {
  const dive = buildPodcastScriptPrompt("AES", ["Ira", "Aisha"], { format: "deep_dive" });
  const critique = buildPodcastScriptPrompt("AES", ["Ira", "Aisha"], { format: "critique" });
  assert.match(dive, /STRUCTURE for Deep Dive/);
  assert.match(critique, /STRUCTURE for The Critique/);
  assert.match(critique, /Critic/);
});

test("parseGuideResponse extracts TITLE and body", () => {
  const parsed = parseGuideResponse("TITLE: AES Encryption\n\nAES is a symmetric cipher used widely in network security.");
  assert.equal(parsed.title, "AES Encryption");
  assert.match(parsed.text, /symmetric cipher/);
});

test("parsePodcastScript reads per-line tones and merges continuations", () => {
  const turns = parsePodcastScript(
    `Ira [excited]: Do you know how AES protects data in transit
Aisha [professional]: It encrypts fixed-size blocks with a shared key.
and that key must stay secret.
Siya: unrelated`,
    ["Ira", "Aisha"],
    10,
  );
  assert.equal(turns.length, 2);
  assert.equal(turns[0].speaker, "Ira");
  assert.equal(turns[0].tone, "excited");
  assert.match(turns[0].text, /\.$/);
  assert.equal(turns[1].speaker, "Aisha");
  assert.equal(turns[1].tone, "professional");
  assert.match(turns[1].text, /shared key/);
  assert.match(turns[1].text, /stay secret/);
});

test("parsePodcastScript remaps sad/angry to teaching tones", () => {
  const turns = parsePodcastScript(
    `Ira [sad]: AES protects data in transit carefully.
Aisha [angry]: The shared key must stay private always.`,
    ["Ira", "Aisha"],
    10,
  );
  assert.equal(turns[0].tone, "excited");
  assert.equal(turns[1].tone, "excited");
});

test("trimPodcastTurns preserves closing debate wrap", () => {
  const turns = Array.from({ length: 10 }, (_, i) => ({
    speaker: i % 2 === 0 ? "Ira" : "Aisha",
    tone: "excited",
    text: `Turn number ${i + 1} is spoken clearly.`,
  }));
  const trimmed = trimPodcastTurns(turns, 6, 2);
  assert.equal(trimmed.length, 6);
  assert.match(trimmed[0].text, /Turn number 1/);
  assert.match(trimmed[4].text, /Turn number 9/);
  assert.match(trimmed[5].text, /Turn number 10/);
});

test("sanitizeSpokenText strips markdown and removes laugh tags", () => {
  const text = sanitizeSpokenText("**AES** protects data <laugh> in transit.");
  assert.match(text, /AES protects/);
  assert.ok(!text.includes("<laugh>"));
  assert.ok(!text.includes("**"));
});

test("sanitizeSpokenText keeps short rebuttals", () => {
  const text = sanitizeSpokenText("I disagree.");
  assert.equal(text, "I disagree.");
});

test("utterancesFromPodcastTurns preserves tone per sentence", () => {
  const utterances = utterancesFromPodcastTurns([
    { speaker: "Ira", tone: "excited", text: "AES protects data in transit. It uses a shared secret key." },
    { speaker: "Aisha", tone: "happy", text: "That key must stay private." },
  ]);
  assert.equal(utterances.length, 3);
  assert.equal(utterances[0].speaker, "Ira");
  assert.equal(utterances[0].tone, "excited");
  assert.equal(utterances[1].tone, "excited");
  assert.equal(utterances[2].speaker, "Aisha");
  assert.equal(utterances[2].tone, "excited");
});

test("buildStudioArtifactPrompt returns report instruction", () => {
  const prompt = buildStudioArtifactPrompt("report", "AES material", "English");
  assert.equal(prompt.title, "Report");
  assert.match(prompt.instruction, /AES material/);
});

test("infographic prompt keeps English keys and requested language values", () => {
  const prompt = buildStudioArtifactPrompt("infographic", "supervised learning notes", "Kannada");
  assert.match(prompt.instruction, /Kannada/);
  assert.match(prompt.instruction, /headline/);
  assert.match(prompt.instruction, /JSON keys stay English|Keep every JSON key in English/i);
});

test("parseStudioJson recovers fenced and smart-quoted infographic JSON", () => {
  const raw = "```json\n{\n  “headline”: “ಮೇಲ್ವಿಚಾರಿತ ಕಲಿಕೆ”,\n  “subtitle”: “ಲೇಬಲ್ ಉದಾಹರಣೆಗಳು\",\n}\n```";
  const parsed = parseStudioJson(raw);
  assert.ok(parsed && typeof parsed === "object");
  assert.equal(parsed.headline, "ಮೇಲ್ವಿಚಾರಿತ ಕಲಿಕೆ");
});
