import tempfile

from backend.memory.extraction import MemoryExtractionService
from backend.memory.schemas import MemoryKind, MemoryRecord
from backend.memory.sqlite_store import SQLiteMemoryStore


def test_sqlite_memory_crud_and_retrieval() -> None:
    with tempfile.NamedTemporaryFile(suffix=".db") as file:
        store = SQLiteMemoryStore(file.name)
        memory = store.add_memory(MemoryRecord(user_id="u1", kind=MemoryKind.preference, key="preferred_language", value="Hindi"))
        assert store.retrieve("u1", "language")[0].value == "Hindi"
        store.delete_memory("u1", memory.id)
        assert store.retrieve("u1", "language") == []
        store.close()


def test_extraction_is_conservative_and_validated() -> None:
    service = MemoryExtractionService()
    candidates = service.extract("preferred language: Hindi")
    assert len(candidates) == 1
    assert service.approve(candidates[0])
    assert service.extract("I live at 123 private street")[0:] == []
