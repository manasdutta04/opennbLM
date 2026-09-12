import assert from "node:assert/strict";
import test from "node:test";
import { createRumikManager, segmentForRumik, parseDeliveryControls, summarizeRumikFailure, buildRumikDescription, accentFromLanguage, resolveRumikRunnerPath, asUnpackedAsarPath } from "../dist/index.js";

test("segmentation preserves short text without terminal punctuation", () => {
  assert.deepEqual(segmentForRumik("Explain recursion"), ["Explain recursion"]);
});

test("segmentation keeps one sentence per chunk", () => {
  const chunks = segmentForRumik("First idea ends here. Second idea follows next.");
  assert.deepEqual(chunks, ["First idea ends here.", "Second idea follows next."]);
});

test("segmentation splits Indic danda sentences and caps Indic lines", () => {
  const chunks = segmentForRumik(
    "मशीन लर्निंग आँकड़ों में पैटर्न खोजती है। यह लेबल वाले उदाहरणों से सीखती है।",
  );
  assert.equal(chunks.length, 2);
  assert.match(chunks[0], /पैटर्न/);
  assert.match(chunks[1], /उदाहरणों/);
  const long = Array.from({ length: 40 }, (_, i) => `शब्द${i}`).join(" ");
  const capped = segmentForRumik(long, undefined, "Hindi");
  assert.ok(capped.length > 1);
  assert.ok(capped.every((item) => item.length <= 200));
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

test("setHfToken records whether a token is stored", async () => {
  const prevHf = process.env.HF_TOKEN;
  const prevHub = process.env.HUGGING_FACE_HUB_TOKEN;
  delete process.env.HF_TOKEN;
  delete process.env.HUGGING_FACE_HUB_TOKEN;
  try {
    const manager = createRumikManager({
      preferredMode: "remote",
      pythonPath: "opennblm-python-does-not-exist",
      modelPath: "missing-model",
      outputDirectory: "temp-audio",
    });
    assert.equal(manager.getStatus().hasHfToken, false);
    manager.setHfToken("hf_test_token");
    assert.equal(manager.getStatus().hasHfToken, true);
    manager.setHfToken("");
    assert.equal(manager.getStatus().hasHfToken, false);
  } finally {
    if (prevHf === undefined) delete process.env.HF_TOKEN;
    else process.env.HF_TOKEN = prevHf;
    if (prevHub === undefined) delete process.env.HUGGING_FACE_HUB_TOKEN;
    else process.env.HUGGING_FACE_HUB_TOKEN = prevHub;
  }
});

test("setPreferredMode switches between remote and local", async () => {
  const manager = createRumikManager({
    pythonPath: "opennblm-python-does-not-exist",
    modelPath: "missing-model",
    outputDirectory: "temp-audio",
  });
  manager.setPreferredMode("local");
  assert.equal(manager.getMode(), "local");
  assert.equal(manager.getStatus().preferredMode, "local");
  manager.setPreferredMode("remote");
  assert.equal(manager.getMode(), "remote");
  assert.equal(manager.getStatus().preferredMode, "remote");
  assert.equal(manager.getStatus().runtimeAvailable, true);
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

test("buildRumikDescription emits HF-canonical strings", () => {
  assert.equal(
    buildRumikDescription({ tone: "excited", accent: "Hindi accent", pace: "fast pace" }),
    "excited, Hindi accent, fast pace",
  );
  assert.equal(accentFromLanguage("English"), "Indian English accent");
  assert.equal(accentFromLanguage("Hindi"), "Hindi accent");
  assert.equal(accentFromLanguage("Telugu"), "Telugu accent");
  assert.equal(accentFromLanguage("Gujarati"), "Indian English accent");
  assert.equal(
    buildRumikDescription({ language: "English" }),
    "professional, Indian English accent, steady pace",
  );
  assert.ok(!buildRumikDescription({ language: "Hindi" }).includes("language="));
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
  assert.match(
    summarizeRumikFailure("Rumik sentence synthesis timed out"),
    /timed out/i,
  );
  assert.match(
    summarizeRumikFailure("Rumik did not write audio output"),
    /did not write audio/i,
  );
  assert.match(
    summarizeRumikFailure("python: can't open file 'app.asar/runtime/rumik_runner.py': [Errno 2] No such file or directory"),
    /runner is missing/i,
  );
});

test("resolveRumikRunnerPath prefers files outside app.asar", () => {
  const unpacked = asUnpackedAsarPath("C:\\app\\resources\\app.asar\\node_modules\\@opennblm\\rumik-runtime\\runtime\\rumik_runner.py");
  assert.match(unpacked, /app\.asar\.unpacked/);
  const found = resolveRumikRunnerPath();
  assert.ok(found);
  assert.match(found, /rumik_runner\.py$/);
});
