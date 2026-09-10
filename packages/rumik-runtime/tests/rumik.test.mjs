import assert from "node:assert/strict";
import test from "node:test";
import { createRumikManager, segmentForRumik } from "../dist/index.js";

test("segmentation preserves short text without terminal punctuation", () => { assert.deepEqual(segmentForRumik("Explain recursion"), ["Explain recursion"]); });
test("missing Rumik runtime is reported without synthesis success", async () => { const manager = createRumikManager({ pythonPath: "opennblm-python-does-not-exist", modelPath: "missing-model", outputDirectory: "temp-audio" }); assert.equal(await manager.healthCheck(), false); await assert.rejects(() => manager.synthesize("Hello.")); assert.equal(manager.getStatus().state, "error"); });
