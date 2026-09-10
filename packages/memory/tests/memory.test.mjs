import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMemoryStore } from "../dist/index.js";

function store() { return createMemoryStore(join(mkdtempSync(join(tmpdir(), "opennblm-memory-")), "memory.sqlite")); }

test("learner memory is separate from conversation history and survives reopening", () => {
  const databasePath = join(mkdtempSync(join(tmpdir(), "opennblm-memory-")), "memory.sqlite");
  const db = createMemoryStore(databasePath);
  const conversation = db.createConversation({ learningTopic: "recursion" });
  db.addMessage({ conversationId: conversation.id, role: "user", text: "What is recursion?" });
  const first = db.upsertLearnerMemory({ kind: "weak_concept", key: "recursion", value: "Needs a simpler intuition", confidence: 0.45, sourceConversationId: conversation.id });
  const updated = db.upsertLearnerMemory({ kind: "weak_concept", key: "recursion", value: "Use a concrete analogy first", confidence: 0.7, sourceConversationId: conversation.id });
  assert.equal(db.listConversations()[0].messages.length, 1);
  assert.equal(db.listLearnerMemory().length, 1);
  assert.equal(first.id, updated.id);
  assert.equal(updated.value, "Use a concrete analogy first");
  db.close();
  const reopened = createMemoryStore(databasePath);
  assert.equal(reopened.listLearnerMemory()[0].value, "Use a concrete analogy first");
  reopened.close();
});

test("learner memory supports forgetting one note and clearing all notes", () => {
  const db = store();
  const topic = db.upsertLearnerMemory({ kind: "topic", key: "fractions", value: "Studied in a lesson" });
  db.upsertLearnerMemory({ kind: "preference", key: "explanation-style", value: "analogies" });
  db.forgetLearnerMemory(topic.id);
  assert.deepEqual(db.listLearnerMemory().map((item) => item.key), ["explanation-style"]);
  db.clearLearnerMemory();
  assert.equal(db.listLearnerMemory().length, 0);
  db.close();
});
