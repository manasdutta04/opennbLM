import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMemoryStore } from "../dist/index.js";

async function store() { return createMemoryStore(join(mkdtempSync(join(tmpdir(), "opennblm-memory-")), "memory.sqlite")); }

test("learner memory is separate from conversation history and survives reopening", async () => {
  const databasePath = join(mkdtempSync(join(tmpdir(), "opennblm-memory-")), "memory.sqlite");
  const db = await createMemoryStore(databasePath);
  const conversation = db.createConversation({ learningTopic: "recursion" });
  db.addMessage({ conversationId: conversation.id, role: "user", text: "What is recursion?" });
  const first = db.upsertLearnerMemory({ kind: "weak_concept", key: "recursion", value: "Needs a simpler intuition", confidence: 0.45, sourceConversationId: conversation.id });
  const updated = db.upsertLearnerMemory({ kind: "weak_concept", key: "recursion", value: "Use a concrete analogy first", confidence: 0.7, sourceConversationId: conversation.id });
  assert.equal(db.listConversations()[0].messages.length, 1);
  assert.equal(db.listLearnerMemory().length, 1);
  assert.equal(first.id, updated.id);
  assert.equal(updated.value, "Use a concrete analogy first");
  db.close();
  const reopened = await createMemoryStore(databasePath);
  assert.equal(reopened.listLearnerMemory()[0].value, "Use a concrete analogy first");
  reopened.close();
});

test("learner memory supports forgetting one note and clearing all notes", async () => {
  const db = await store();
  const topic = db.upsertLearnerMemory({ kind: "topic", key: "fractions", value: "Studied in a lesson" });
  db.upsertLearnerMemory({ kind: "preference", key: "explanation-style", value: "analogies" });
  db.forgetLearnerMemory(topic.id);
  assert.deepEqual(db.listLearnerMemory().map((item) => item.key), ["explanation-style"]);
  db.clearLearnerMemory();
  assert.equal(db.listLearnerMemory().length, 0);
  db.close();
});

test("notebooks store sources, chunks, notes, and search", async () => {
  const db = await store();
  const notebook = db.notebooks.createNotebook("Physics");
  const source = db.notebooks.createSource({
    notebookId: notebook.id,
    kind: "text",
    title: "Gravity notes",
    status: "ready",
  });
  db.notebooks.replaceChunks(source.id, notebook.id, [
    "Gravity pulls objects together. Escape velocity depends on mass and radius.",
  ]);
  db.notebooks.createNote(notebook.id, { title: "Key idea", body: "Mass curves spacetime.", kind: "manual" });
  const hits = db.notebooks.searchAll("escape velocity", notebook.id);
  assert.ok(hits.some((hit) => hit.kind === "chunk"));
  assert.equal(db.notebooks.listNotes(notebook.id).length, 1);
  db.notebooks.updateSource(source.id, { contextLevel: "excluded" });
  assert.equal(db.notebooks.listChunks(notebook.id, { excludeExcluded: true }).length, 0);
  const listed = db.notebooks.listNotebooks();
  assert.equal(listed[0].sourceCount, 1);
  const art = db.notebooks.createArtifact({
    notebookId: notebook.id,
    kind: "report",
    title: "Briefing",
    body: "Overview text",
    status: "ready",
  });
  assert.equal(db.notebooks.listArtifacts(notebook.id)[0].id, art.id);
  db.notebooks.removeArtifact(art.id);
  assert.equal(db.notebooks.listArtifacts(notebook.id).length, 0);
  const filtered = db.notebooks.listChunks(notebook.id, { excludeExcluded: false, sourceIds: [source.id] });
  assert.equal(filtered.length, 1);
  db.close();
});
