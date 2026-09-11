import assert from "node:assert/strict";
import test from "node:test";
import { createRumikManager, segmentForRumik, parseDeliveryControls } from "../dist/index.js";

test("segmentation preserves short text without terminal punctuation", () => {
  assert.deepEqual(segmentForRumik("Explain recursion"), ["Explain recursion"]);
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
