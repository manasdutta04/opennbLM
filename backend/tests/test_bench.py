import json
from pathlib import Path
from bench.run import run

def test_benchmark_records_attempt_without_fabricating_learning_scores(tmp_path:Path)->None:
    tasks=tmp_path/"tasks.jsonl"; output=tmp_path/"results.jsonl"; tasks.write_text(json.dumps({"id":"x","category":"simple","prompt":"Explain"})+"\n",encoding="utf-8")
    run(tasks,output,"A"); result=json.loads(output.read_text(encoding="utf-8"))
    assert result["success"] is True and result["latency_ms"] >= 0 and result["comprehension"] is None and result["recall"] is None
