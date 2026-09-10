import initSqlJs from "sql.js";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AddMessageInput, Conversation, ConversationMessage, CreateConversationInput, LearnerMemory, LearnerMemoryKind } from "@opennblm/contracts";

const require = createRequire(import.meta.url);
type SqlDatabase = { exec(sql: string): void; prepare(sql: string): SqlStatement; run(sql: string, params?: unknown[]): void; export(): Uint8Array; close(): void };
type SqlStatement = { bind(params?: unknown[] | Record<string, unknown>): void; step(): boolean; getAsObject(): Record<string, unknown>; free(): void };

export interface LearnerMemoryInput { kind: LearnerMemoryKind; key: string; value: string; confidence?: number; sourceConversationId?: string; }
export interface MemoryStore { readonly databasePath: string; listConversations(search?: string): Conversation[]; createConversation(input?: CreateConversationInput): Conversation; renameConversation(id: string, title: string): Conversation; addMessage(input: AddMessageInput): ConversationMessage; deleteConversation(id: string): void; listLearnerMemory(): LearnerMemory[]; upsertLearnerMemory(input: LearnerMemoryInput): LearnerMemory; forgetLearnerMemory(id: string): void; clearLearnerMemory(): void; close(): void; }

function rows(db: SqlDatabase, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const statement = db.prepare(sql);
  try { statement.bind(params); const result: Record<string, unknown>[] = []; while (statement.step()) result.push(statement.getAsObject()); return result; } finally { statement.free(); }
}
function run(db: SqlDatabase, sql: string, params: unknown[] = []): void { db.run(sql, params); }

export async function createMemoryStore(databasePath: string): Promise<MemoryStore> {
  const SQL = await initSqlJs({ locateFile: (file) => require.resolve(join("sql.js", "dist", file)) });
  const db = (existsSync(databasePath) ? new SQL.Database(new Uint8Array(readFileSync(databasePath))) : new SQL.Database()) as unknown as SqlDatabase;
  try { chmodSync(databasePath, 0o600); } catch {}
  db.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, learning_topic TEXT NOT NULL, subject TEXT, language TEXT, learner_context TEXT);
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, role TEXT NOT NULL, text TEXT NOT NULL, timestamp TEXT NOT NULL, audio_reference TEXT, teaching_metadata TEXT);
    CREATE TABLE IF NOT EXISTS learner_memory (id TEXT PRIMARY KEY, kind TEXT NOT NULL, memory_key TEXT NOT NULL, value TEXT NOT NULL, confidence REAL NOT NULL DEFAULT 0.5, source_conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(kind, memory_key));
    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_learner_memory_updated_at ON learner_memory(updated_at DESC);`);
  const persist = () => { writeFileSync(databasePath, Buffer.from(db.export())); try { chmodSync(databasePath, 0o600); } catch {} };
  const now = () => new Date().toISOString();
  const map = (row: Record<string, unknown>): Conversation => ({ id: String(row.id), title: String(row.title), createdAt: String(row.created_at), updatedAt: String(row.updated_at), learningTopic: String(row.learning_topic), subject: row.subject ? String(row.subject) : undefined, language: row.language ? String(row.language) : undefined, learnerContext: row.learner_context ? String(row.learner_context) : undefined, messages: rows(db, "SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC", [row.id]).map((message) => ({ id: String(message.id), conversationId: String(message.conversation_id), role: message.role as ConversationMessage["role"], text: String(message.text), timestamp: String(message.timestamp), audioReference: message.audio_reference ? String(message.audio_reference) : undefined, teachingMetadata: message.teaching_metadata ? JSON.parse(String(message.teaching_metadata)) : undefined })) });
  const mapMemory = (row: Record<string, unknown>): LearnerMemory => ({ id: String(row.id), kind: row.kind as LearnerMemoryKind, key: String(row.memory_key), value: String(row.value), confidence: Number(row.confidence), sourceConversationId: row.source_conversation_id ? String(row.source_conversation_id) : undefined, createdAt: String(row.created_at), updatedAt: String(row.updated_at) });
  return { databasePath,
    listConversations(search) { const term = search?.trim(); const result = term ? rows(db, "SELECT * FROM conversations WHERE title LIKE ? OR learning_topic LIKE ? ORDER BY updated_at DESC", [`%${term}%`, `%${term}%`]) : rows(db, "SELECT * FROM conversations ORDER BY updated_at DESC"); return result.map(map); },
    createConversation(input = {}) { const timestamp = now(); const row = { id: randomUUID(), title: input.title?.trim() || "Untitled lesson", created_at: timestamp, updated_at: timestamp, learning_topic: input.learningTopic?.trim() || "Open exploration", subject: input.subject ?? null, language: input.language ?? null, learner_context: input.learnerContext ?? null }; run(db, "INSERT INTO conversations (id,title,created_at,updated_at,learning_topic,subject,language,learner_context) VALUES (?,?,?,?,?,?,?,?)", Object.values(row)); persist(); return map(rows(db, "SELECT * FROM conversations WHERE id = ?", [row.id])[0]); },
    renameConversation(id, title) { const clean = title.trim(); if (!clean) throw new Error("Conversation title cannot be empty"); run(db, "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", [clean, now(), id]); if (!rows(db, "SELECT id FROM conversations WHERE id = ?", [id]).length) throw new Error("Conversation not found"); persist(); return map(rows(db, "SELECT * FROM conversations WHERE id = ?", [id])[0]); },
    addMessage(input) { const timestamp = now(); const id = randomUUID(); if (!rows(db, "SELECT id FROM conversations WHERE id = ?", [input.conversationId]).length) throw new Error("Conversation not found"); run(db, "INSERT INTO messages (id,conversation_id,role,text,timestamp,audio_reference,teaching_metadata) VALUES (?,?,?,?,?,?,?)", [id, input.conversationId, input.role, input.text, timestamp, input.audioReference ?? null, input.teachingMetadata ? JSON.stringify(input.teachingMetadata) : null]); run(db, "UPDATE conversations SET updated_at = ? WHERE id = ?", [timestamp, input.conversationId]); persist(); return { id, conversationId: input.conversationId, role: input.role, text: input.text, timestamp, audioReference: input.audioReference, teachingMetadata: input.teachingMetadata }; },
    deleteConversation(id) { run(db, "DELETE FROM conversations WHERE id = ?", [id]); persist(); },
    listLearnerMemory() { return rows(db, "SELECT * FROM learner_memory ORDER BY updated_at DESC").map(mapMemory); },
    upsertLearnerMemory(input) { const timestamp = now(); const existing = rows(db, "SELECT id, created_at FROM learner_memory WHERE kind = ? AND memory_key = ?", [input.kind, input.key])[0]; const id = existing?.id ? String(existing.id) : randomUUID(); run(db, "INSERT INTO learner_memory (id, kind, memory_key, value, confidence, source_conversation_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(kind,memory_key) DO UPDATE SET value=excluded.value, confidence=excluded.confidence, source_conversation_id=excluded.source_conversation_id, updated_at=excluded.updated_at", [id, input.kind, input.key, input.value, input.confidence ?? 0.5, input.sourceConversationId ?? null, existing?.created_at ?? timestamp, timestamp]); persist(); return mapMemory(rows(db, "SELECT * FROM learner_memory WHERE id = ?", [id])[0]); },
    forgetLearnerMemory(id) { run(db, "DELETE FROM learner_memory WHERE id = ?", [id]); persist(); },
    clearLearnerMemory() { run(db, "DELETE FROM learner_memory"); persist(); },
    close() { persist(); db.close(); }
  };
}
