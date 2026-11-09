// Fail if the version differs between package.json, manifest.json and
// .claude-plugin/plugin.json — or from the release tag, when one is passed.
//
// Usage: node scripts/check-versions.mjs [v1.2.3]
import fs from "fs";

const files = ["package.json", "manifest.json", ".claude-plugin/plugin.json"];
const versions = Object.fromEntries(
  files.map((f) => [f, JSON.parse(fs.readFileSync(f, "utf-8")).version])
);

const tag = process.argv[2];
if (tag) versions[`tag ${tag}`] = tag.replace(/^v/, "");

const unique = new Set(Object.values(versions));
if (unique.size > 1) {
  console.error("Version mismatch:");
  for (const [source, version] of Object.entries(versions)) console.error(`  ${source}: ${version}`);
  process.exit(1);
}
console.log(`Versions match: ${[...unique][0]}`);
