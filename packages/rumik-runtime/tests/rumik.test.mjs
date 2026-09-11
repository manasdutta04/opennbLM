import assert from "node:assert/strict";
import test from "node:test";
import { createRumikManager, segmentForRumik, parseDeliveryControls, summarizeRumikFailure } from "../dist/index.js";

test("segmentation preserves short text without terminal punctuation", () => {
  assert.deepEqual(segmentForRumik("Explain recursion"), ["Explain recursion"]);
});

test("segmentation keeps one sentence per chunk", () => {
  const chunks = segmentForRumik("First idea ends here. Second idea follows next.");
  assert.deepEqual(chunks, ["First idea ends here.", "Second idea follows next."]);
});

test("segmentation splits oversized sentences on word boundaries", () => {
  const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");
  const chunks = segmentForRumik(long, 120);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((c) => c.length <= 120));
});

test("forced local mode reports missing runtime without synthesis success", async () => {
  const manager = createRumikManager({
    preferredMode: "local",
    pythonPath: "opennblm-python-does-not-exist",
    modelPath: "missing-model",
    outputDirectory: "temp-audio",
  });
  assert.equal(await manager.healthCheck(), false);
  await assert.rejects(() => manager.synthesize("Hello."));
  assert.equal(manager.getStatus().state, "error");
  assert.equal(manager.getMode(), "local");
});

test("without CUDA preference, default mode is remote reachability fallback", async () => {
  const manager = createRumikManager({
    pythonPath: "opennblm-python-does-not-exist",
    modelPath: "missing-model",
    outputDirectory: "temp-audio",
  });
  // Force remote selection path used when CUDA is absent.
  process.env.RUMIK_FORCE_REMOTE = "1";
  try {
    assert.equal(await manager.healthCheck(), true);
    assert.equal(manager.getMode(), "remote");
    assert.equal(manager.getStatus().mode, "remote");
  } finally {
    delete process.env.RUMIK_FORCE_REMOTE;
  }
});

test("delivery description maps to Space tone/accent/pace controls", () => {
  const parsed = parseDeliveryControls("excited, Hindi accent, fast pace");
  assert.equal(parsed.tone, "excited");
  assert.equal(parsed.accent, "Hindi accent");
  assert.equal(parsed.pace, "fast pace");
});

test("summarizeRumikFailure strips tqdm dumps and command-line errors", () => {
  assert.match(
    summarizeRumikFailure("Error: spawn UNKNOWN\nThe command line is too long."),
    /command line too long/i,
  );
  const dumped = summarizeRumikFailure(
    "Loading weights: 65%|████| 65/296 [00:01<00:01, 30.02it/s]\n[rumik] wrote out.wav\nRuntimeError: CUDA out of memory",
  );
  assert.match(dumped, /GPU memory|out of memory/i);
  assert.ok(!dumped.includes("it/s"));
});
