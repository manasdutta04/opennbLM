import { randomUUID } from "node:crypto";
import type {
  Notebook,
  NotebookNote,
  NotebookSearchHit,
  NotebookSource,
  NoteKind,
  PodcastEpisode,
  SourceContextLevel,
  SourceKind,
  SourceStatus,
} from "@opennblm/contracts";

type SqlDatabase = {
  exec(sql: string): void;
  prepare(sql: string): SqlStatement;
  run(sql: string, params?: unknown[]): void;
};
type SqlStatement = {
  bind(params?: unknown[] | Record<string, unknown>): void;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): void;
};

function rows(db: SqlDatabase, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const statement = db.prepare(sql);
  try {
    statement.bind(params);
    const result: Record<string, unknown>[] = [];
    while (statement.step()) result.push(statement.getAsObject());
    return result;
  } finally {
    statement.free();
  }
}

function run(db: SqlDatabase, sql: string, params: unknown[] = []): void {
  db.run(sql, params);
}

export interface ChunkRow {
  id: string;
  sourceId: string;
  notebookId: string;
  index: number;
  text: string;
}

export interface NotebookStore {
  ensureSchema(): void;
  listNotebooks(): Notebook[];
  createNotebook(title?: string): Notebook;
  renameNotebook(id: string, title: string): Notebook;
  removeNotebook(id: string): void;
  listSources(notebookId: string): NotebookSource[];
  createSource(input: {
    notebookId: string;
    kind: SourceKind;
    title: string;
    status?: SourceStatus;
    localPath?: string;
    url?: string;
    error?: string;
    contextLevel?: SourceContextLevel;
  }): NotebookSource;
  updateSource(
    id: string,
    patch: Partial<{
      status: SourceStatus;
      title: string;
      error: string | null;
      contextLevel: SourceContextLevel;
      localPath: string;
      url: string;
      kind: SourceKind;
    }>,
  ): NotebookSource;
  removeSource(id: string): void;
  replaceChunks(sourceId: string, notebookId: string, texts: string[]): void;
  listChunks(notebookId: string, opts?: { excludeExcluded?: boolean }): ChunkRow[];
  searchChunks(query: string, notebookId?: string, limit?: number): Array<ChunkRow & { title: string }>;
  listNotes(notebookId: string): NotebookNote[];
  createNote(notebookId: string, input: { title: string; body: string; kind?: NoteKind }): NotebookNote;
  updateNote(id: string, input: { title?: string; body?: string }): NotebookNote;
  removeNote(id: string): void;
  searchNotes(query: string, notebookId?: string): NotebookNote[];
  listPodcasts(notebookId: string): PodcastEpisode[];
  createPodcast(input: {
    notebookId: string;
    title: string;
    speakers: string[];
    status?: PodcastEpisode["status"];
  }): PodcastEpisode;
  updatePodcast(
    id: string,
    patch: Partial<{ status: PodcastEpisode["status"]; script: string; audioPaths: string[]; error: string | null }>,
  ): PodcastEpisode;
  searchAll(query: string, notebookId?: string): NotebookSearchHit[];
}

export function createNotebookStore(db: SqlDatabase, persist: () => void): NotebookStore {
  const now = () => new Date().toISOString();

  const mapNotebook = (row: Record<string, unknown>): Notebook => ({
    id: String(row.id),
    title: String(row.title),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  });

  const mapSource = (row: Record<string, unknown>): NotebookSource => ({
    id: String(row.id),
    notebookId: String(row.notebook_id),
    kind: row.kind as SourceKind,
    title: String(row.title),
    status: row.status as SourceStatus,
    contextLevel: (row.context_level as SourceContextLevel) || "full",
    localPath: row.local_path ? String(row.local_path) : undefined,
    url: row.url ? String(row.url) : undefined,
    error: row.error ? String(row.error) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  });

  const mapNote = (row: Record<string, unknown>): NotebookNote => ({
    id: String(row.id),
    notebookId: String(row.notebook_id),
    kind: row.kind as NoteKind,
    title: String(row.title),
    body: String(row.body),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  });

  const mapPodcast = (row: Record<string, unknown>): PodcastEpisode => ({
    id: String(row.id),
    notebookId: String(row.notebook_id),
    title: String(row.title),
    status: row.status as PodcastEpisode["status"],
    script: row.script ? String(row.script) : undefined,
    speakers: row.speakers ? (JSON.parse(String(row.speakers)) as string[]) : [],
    audioPaths: row.audio_paths ? (JSON.parse(String(row.audio_paths)) as string[]) : [],
    error: row.error ? String(row.error) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  });

  return {
    ensureSchema() {
      db.exec(`
        CREATE TABLE IF NOT EXISTS notebooks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS notebook_sources (
          id TEXT PRIMARY KEY,
          notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
          kind TEXT NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL,
          context_level TEXT NOT NULL DEFAULT 'full',
          local_path TEXT,
          url TEXT,
          error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS notebook_chunks (
          id TEXT PRIMARY KEY,
          source_id TEXT NOT NULL REFERENCES notebook_sources(id) ON DELETE CASCADE,
          notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
          chunk_index INTEGER NOT NULL,
          text TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS notebook_notes (
          id TEXT PRIMARY KEY,
          notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
          kind TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS notebook_podcasts (
          id TEXT PRIMARY KEY,
          notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          status TEXT NOT NULL,
          script TEXT,
          speakers TEXT NOT NULL DEFAULT '[]',
          audio_paths TEXT NOT NULL DEFAULT '[]',
          error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_notebooks_updated ON notebooks(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notebook_sources_nb ON notebook_sources(notebook_id);
        CREATE INDEX IF NOT EXISTS idx_notebook_chunks_nb ON notebook_chunks(notebook_id);
        CREATE INDEX IF NOT EXISTS idx_notebook_notes_nb ON notebook_notes(notebook_id);
      `);
      try {
        db.exec(`ALTER TABLE conversations ADD COLUMN notebook_id TEXT REFERENCES notebooks(id) ON DELETE SET NULL`);
      } catch {
        /* already migrated */
      }
    },

    listNotebooks() {
      return rows(db, "SELECT * FROM notebooks ORDER BY updated_at DESC").map(mapNotebook);
    },

    createNotebook(title) {
      const timestamp = now();
      const id = randomUUID();
      run(db, "INSERT INTO notebooks (id, title, created_at, updated_at) VALUES (?,?,?,?)", [
        id,
        title?.trim() || "Untitled notebook",
        timestamp,
        timestamp,
      ]);
      persist();
      return mapNotebook(rows(db, "SELECT * FROM notebooks WHERE id = ?", [id])[0]!);
    },

    renameNotebook(id, title) {
      const clean = title.trim();
      if (!clean) throw new Error("Notebook title cannot be empty");
      run(db, "UPDATE notebooks SET title = ?, updated_at = ? WHERE id = ?", [clean, now(), id]);
      persist();
      const row = rows(db, "SELECT * FROM notebooks WHERE id = ?", [id])[0];
      if (!row) throw new Error("Notebook not found");
      return mapNotebook(row);
    },

    removeNotebook(id) {
      run(db, "DELETE FROM notebooks WHERE id = ?", [id]);
      persist();
    },

    listSources(notebookId) {
      return rows(db, "SELECT * FROM notebook_sources WHERE notebook_id = ? ORDER BY created_at ASC", [notebookId]).map(mapSource);
    },

    createSource(input) {
      const timestamp = now();
      const id = randomUUID();
      run(
        db,
        "INSERT INTO notebook_sources (id, notebook_id, kind, title, status, context_level, local_path, url, error, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [
          id,
          input.notebookId,
          input.kind,
          input.title,
          input.status ?? "processing",
          input.contextLevel ?? "full",
          input.localPath ?? null,
          input.url ?? null,
          input.error ?? null,
          timestamp,
          timestamp,
        ],
      );
      run(db, "UPDATE notebooks SET updated_at = ? WHERE id = ?", [timestamp, input.notebookId]);
      persist();
      return mapSource(rows(db, "SELECT * FROM notebook_sources WHERE id = ?", [id])[0]!);
    },

    updateSource(id, patch) {
      const current = rows(db, "SELECT * FROM notebook_sources WHERE id = ?", [id])[0];
      if (!current) throw new Error("Source not found");
      const timestamp = now();
      run(
        db,
        "UPDATE notebook_sources SET status = ?, title = ?, error = ?, context_level = ?, local_path = ?, url = ?, kind = ?, updated_at = ? WHERE id = ?",
        [
          patch.status ?? current.status,
          patch.title ?? current.title,
          patch.error === undefined ? current.error : patch.error,
          patch.contextLevel ?? current.context_level,
          patch.localPath ?? current.local_path,
          patch.url ?? current.url,
          patch.kind ?? current.kind,
          timestamp,
          id,
        ],
      );
      run(db, "UPDATE notebooks SET updated_at = ? WHERE id = ?", [timestamp, current.notebook_id]);
      persist();
      return mapSource(rows(db, "SELECT * FROM notebook_sources WHERE id = ?", [id])[0]!);
    },

    removeSource(id) {
      run(db, "DELETE FROM notebook_sources WHERE id = ?", [id]);
      persist();
    },

    replaceChunks(sourceId, notebookId, texts) {
      run(db, "DELETE FROM notebook_chunks WHERE source_id = ?", [sourceId]);
      texts.forEach((text, index) => {
        run(db, "INSERT INTO notebook_chunks (id, source_id, notebook_id, chunk_index, text) VALUES (?,?,?,?,?)", [
          randomUUID(),
          sourceId,
          notebookId,
          index,
          text,
        ]);
      });
      persist();
    },

    listChunks(notebookId, opts) {
      const sources = rows(db, "SELECT id, context_level FROM notebook_sources WHERE notebook_id = ? AND status = 'ready'", [
        notebookId,
      ]);
      const allowed = new Set(
        sources
          .filter((s) => !opts?.excludeExcluded || String(s.context_level) !== "excluded")
          .map((s) => String(s.id)),
      );
      return rows(db, "SELECT * FROM notebook_chunks WHERE notebook_id = ? ORDER BY chunk_index ASC", [notebookId])
        .filter((row) => allowed.has(String(row.source_id)))
        .map((row) => ({
          id: String(row.id),
          sourceId: String(row.source_id),
          notebookId: String(row.notebook_id),
          index: Number(row.chunk_index),
          text: String(row.text),
        }));
    },

    searchChunks(query, notebookId, limit = 8) {
      const terms = query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 1);
      if (!terms.length) return [];
      const sql = notebookId
        ? "SELECT c.*, s.title as title, s.context_level as context_level FROM notebook_chunks c JOIN notebook_sources s ON s.id = c.source_id WHERE c.notebook_id = ? AND s.status = 'ready' AND s.context_level != 'excluded'"
        : "SELECT c.*, s.title as title, s.context_level as context_level FROM notebook_chunks c JOIN notebook_sources s ON s.id = c.source_id WHERE s.status = 'ready' AND s.context_level != 'excluded'";
      const params = notebookId ? [notebookId] : [];
      return rows(db, sql, params)
        .map((row) => {
          const text = String(row.text);
          const title = String(row.title);
          const hay = `${title}\n${text}`.toLowerCase();
          const score = terms.reduce((sum, term) => sum + (hay.includes(term) ? 1 : 0), 0);
          return {
            id: String(row.id),
            sourceId: String(row.source_id),
            notebookId: String(row.notebook_id),
            index: Number(row.chunk_index),
            text,
            title,
            score,
          };
        })
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },

    listNotes(notebookId) {
      return rows(db, "SELECT * FROM notebook_notes WHERE notebook_id = ? ORDER BY updated_at DESC", [notebookId]).map(mapNote);
    },

    createNote(notebookId, input) {
      const timestamp = now();
      const id = randomUUID();
      run(db, "INSERT INTO notebook_notes (id, notebook_id, kind, title, body, created_at, updated_at) VALUES (?,?,?,?,?,?,?)", [
        id,
        notebookId,
        input.kind ?? "manual",
        input.title,
        input.body,
        timestamp,
        timestamp,
      ]);
      run(db, "UPDATE notebooks SET updated_at = ? WHERE id = ?", [timestamp, notebookId]);
      persist();
      return mapNote(rows(db, "SELECT * FROM notebook_notes WHERE id = ?", [id])[0]!);
    },

    updateNote(id, input) {
      const current = rows(db, "SELECT * FROM notebook_notes WHERE id = ?", [id])[0];
      if (!current) throw new Error("Note not found");
      const timestamp = now();
      run(db, "UPDATE notebook_notes SET title = ?, body = ?, updated_at = ? WHERE id = ?", [
        input.title ?? current.title,
        input.body ?? current.body,
        timestamp,
        id,
      ]);
      persist();
      return mapNote(rows(db, "SELECT * FROM notebook_notes WHERE id = ?", [id])[0]!);
    },

    removeNote(id) {
      run(db, "DELETE FROM notebook_notes WHERE id = ?", [id]);
      persist();
    },

    searchNotes(query, notebookId) {
      const term = query.trim().toLowerCase();
      const all = notebookId
        ? rows(db, "SELECT * FROM notebook_notes WHERE notebook_id = ?", [notebookId])
        : rows(db, "SELECT * FROM notebook_notes");
      return all
        .map(mapNote)
        .filter((note) => note.title.toLowerCase().includes(term) || note.body.toLowerCase().includes(term));
    },

    listPodcasts(notebookId) {
      return rows(db, "SELECT * FROM notebook_podcasts WHERE notebook_id = ? ORDER BY created_at DESC", [notebookId]).map(mapPodcast);
    },

    createPodcast(input) {
      const timestamp = now();
      const id = randomUUID();
      run(
        db,
        "INSERT INTO notebook_podcasts (id, notebook_id, title, status, speakers, audio_paths, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
        [id, input.notebookId, input.title, input.status ?? "processing", JSON.stringify(input.speakers), "[]", timestamp, timestamp],
      );
      persist();
      return mapPodcast(rows(db, "SELECT * FROM notebook_podcasts WHERE id = ?", [id])[0]!);
    },

    updatePodcast(id, patch) {
      const current = rows(db, "SELECT * FROM notebook_podcasts WHERE id = ?", [id])[0];
      if (!current) throw new Error("Podcast not found");
      const timestamp = now();
      run(
        db,
        "UPDATE notebook_podcasts SET status = ?, script = ?, audio_paths = ?, error = ?, updated_at = ? WHERE id = ?",
        [
          patch.status ?? current.status,
          patch.script ?? current.script,
          patch.audioPaths ? JSON.stringify(patch.audioPaths) : current.audio_paths,
          patch.error === undefined ? current.error : patch.error,
          timestamp,
          id,
        ],
      );
      persist();
      return mapPodcast(rows(db, "SELECT * FROM notebook_podcasts WHERE id = ?", [id])[0]!);
    },

    searchAll(query, notebookId) {
      const hits: NotebookSearchHit[] = [];
      for (const chunk of this.searchChunks(query, notebookId, 12)) {
        hits.push({
          kind: "chunk",
          notebookId: chunk.notebookId,
          id: chunk.sourceId,
          title: chunk.title,
          excerpt: chunk.text.slice(0, 240),
        });
      }
      for (const note of this.searchNotes(query, notebookId).slice(0, 8)) {
        hits.push({
          kind: "note",
          notebookId: note.notebookId,
          id: note.id,
          title: note.title,
          excerpt: note.body.slice(0, 240),
        });
      }
      return hits;
    },
  };
}
