"""Reliable local SQLite persistence for learning memory."""

import sqlite3
from datetime import datetime, timezone

from backend.memory.schemas import ConversationMessage, MemoryRecord, ProgressRecord, TopicRecord


class SQLiteMemoryStore:
    def __init__(self, path: str = "opennblm.sqlite3") -> None:
        self.connection = sqlite3.connect(path)
        self.connection.row_factory = sqlite3.Row
        self._create_tables()

    def _create_tables(self) -> None:
        self.connection.executescript("""
        CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS learner_memory (id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, confidence REAL NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(user_id, kind, key));
        CREATE TABLE IF NOT EXISTS learning_progress (id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, topic TEXT NOT NULL, status TEXT NOT NULL, notes TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(user_id, topic));
        CREATE TABLE IF NOT EXISTS topic_history (id INTEGER PRIMARY KEY, user_id TEXT NOT NULL, topic TEXT NOT NULL, difficulty TEXT, studied_at TEXT NOT NULL);
        """)
        self.connection.commit()

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def add_memory(self, memory: MemoryRecord) -> MemoryRecord:
        now = self._now()
        cur = self.connection.execute("INSERT INTO learner_memory(user_id,kind,key,value,confidence,source,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id,kind,key) DO UPDATE SET value=excluded.value, confidence=excluded.confidence, source=excluded.source, updated_at=excluded.updated_at", (memory.user_id, memory.kind.value, memory.key, memory.value, memory.confidence, memory.source, now, now))
        self.connection.commit()
        return self.get_memory(memory.user_id, cur.lastrowid or self._find_id(memory))

    def _find_id(self, memory: MemoryRecord) -> int:
        row = self.connection.execute("SELECT id FROM learner_memory WHERE user_id=? AND kind=? AND key=?", (memory.user_id, memory.kind.value, memory.key)).fetchone()
        return int(row[0])

    def get_memory(self, user_id: str, memory_id: int) -> MemoryRecord:
        row = self.connection.execute("SELECT * FROM learner_memory WHERE user_id=? AND id=?", (user_id, memory_id)).fetchone()
        if row is None: raise KeyError("memory not found")
        return MemoryRecord(id=row["id"], user_id=row["user_id"], kind=row["kind"], key=row["key"], value=row["value"], confidence=row["confidence"], source=row["source"], created_at=row["created_at"], updated_at=row["updated_at"])

    def retrieve(self, user_id: str, query: str, limit: int = 10) -> list[MemoryRecord]:
        terms = [term for term in query.lower().split() if term]
        rows = self.connection.execute("SELECT * FROM learner_memory WHERE user_id=? ORDER BY updated_at DESC", (user_id,)).fetchall()
        ranked = sorted(rows, key=lambda row: sum(term in f"{row['key']} {row['value']}".lower() for term in terms), reverse=True)
        return [self.get_memory(user_id, row["id"]) for row in ranked[:limit]]

    def delete_memory(self, user_id: str, memory_id: int) -> None:
        self.connection.execute("DELETE FROM learner_memory WHERE user_id=? AND id=?", (user_id, memory_id)); self.connection.commit()

    def add_conversation(self, message: ConversationMessage) -> None:
        self.connection.execute("INSERT INTO conversations(user_id,role,content,created_at) VALUES(?,?,?,?)", (message.user_id, message.role, message.content, self._now())); self.connection.commit()

    def add_topic(self, record: TopicRecord) -> None:
        self.connection.execute("INSERT INTO topic_history(user_id,topic,difficulty,studied_at) VALUES(?,?,?,?)", (record.user_id, record.topic, record.difficulty, self._now())); self.connection.commit()

    def upsert_progress(self, record: ProgressRecord) -> None:
        self.connection.execute("INSERT INTO learning_progress(user_id,topic,status,notes,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,topic) DO UPDATE SET status=excluded.status, notes=excluded.notes, updated_at=excluded.updated_at", (record.user_id, record.topic, record.status, record.notes, self._now())); self.connection.commit()

    def close(self) -> None: self.connection.close()
