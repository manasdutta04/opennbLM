import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const yml = readFileSync("electron-builder.yml", "utf8");
const missing = [];

for (const name of readdirSync("packages")) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(join("packages", name, "package.json"), "utf8"));
  } catch {
    continue;
  }
  for (const [dep, spec] of Object.entries(pkg.dependencies ?? {})) {
    if (String(spec).startsWith("workspace:")) continue;
    const listed = yml.includes(dep) || yml.includes(dep.replace("/", "+"));
    if (!listed) missing.push(`${pkg.name} → ${dep}`);
  }
}

if (missing.length) {
  console.error("electron-builder.yml is missing npm dependencies required at runtime:");
  for (const item of missing) console.error(`  - ${item}`);
  process.exit(1);
}

console.log("electron-builder.yml lists every non-workspace package dependency.");
