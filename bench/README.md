# opennbLM-Bench

This harness measures plain LLM text (A), LLM plus standard TTS (B), LLM plus Rumik (C), and the full Teaching + Delivery + Rumik pipeline (D). It records actual generation attempts, latency, success/failure, structured validity, language metadata, delivery instructions, and audio metadata when real adapters provide them.

Comprehension and recall are reserved for human or separately validated learner studies. The runner never fabricates those scores. Failed generations remain failures.

Run from the repository root:

```bash
python -m bench.run --tasks bench/tasks.jsonl --output bench/results/run.jsonl --condition D
```

The included dry adapter only validates the harness. Real adapters must be configured before interpreting results. Record model versions, prompts, seeds, hardware, warm-up, network, and concurrency for reproducibility. Latency and output quality are not directly comparable across environments; Rumik adherence should be evaluated from audio, not instructions alone.
