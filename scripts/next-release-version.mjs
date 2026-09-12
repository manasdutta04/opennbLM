import { execSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const pkgPath = "package.json";
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

function parse(tag) {
  const match = String(tag).trim().match(/^v(\d+)\.(\d+)\.(\d+)$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function greater(left, right) {
  return left[0] > right[0]
    || (left[0] === right[0] && left[1] > right[1])
    || (left[0] === right[0] && left[1] === right[1] && left[2] > right[2]);
}

let highest = parse(`v${pkg.version}`) ?? [0, 1, 0];
const tags = execSync("git tag -l v*", { encoding: "utf8" })
  .split(/\r?\n/)
  .map((tag) => tag.trim())
  .filter(Boolean);

for (const tag of tags) {
  const version = parse(tag);
  if (version && greater(version, highest)) highest = version;
}

const next = `${highest[0]}.${highest[1]}.${highest[2] + 1}`;
pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const output = process.env.GITHUB_OUTPUT;
if (output) {
  appendFileSync(output, `version=${next}\ntag=v${next}\nname=opennbLM v${next}\n`);
}

process.stdout.write(`${next}\n`);
