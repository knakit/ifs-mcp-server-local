// Guard rail: keep the product name consistent across docs, manifests, source and images.
//
// The product is called "MCP Server for IFS Cloud" (prose: "the MCP server for IFS Cloud").
// It is NOT "IFS Cloud MCP Server" or "IFS MCP Server" — that wording reads as if IFS ships it.
// Identifiers such as `ifs-mcp-server`, `~/.ifs-mcp` and `ifs-mcp-skills` are unaffected: the
// rules only match the spaced, human-readable forms.
//
// To allow a deliberate exception, put `terminology-ok` on the same line (e.g. in a comment).
//
// Usage: node scripts/check-terminology.mjs
import fs from "fs";
import path from "path";

const RULES = [
  {
    pattern: /\bIFS(?: Cloud)? MCP(?: [Ss]erver)?\b/,
    fix: 'use "MCP Server for IFS Cloud" (prose: "the MCP server for IFS Cloud")',
  },
  {
    pattern: /\b(?:IFS cloud|Ifs Cloud|ifs Cloud)\b/,
    fix: 'write "IFS Cloud"',
  },
];

const SCAN_EXTENSIONS = new Set([".md", ".json", ".svg", ".ts", ".mjs", ".yml", ".yaml", ".sh"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "build", "dist-plugin", ".claude"]);
const SKIP_FILES = new Set(["package-lock.json", "scripts/check-terminology.mjs"]);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(full);
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

const violations = [];
for (const file of walk(".")) {
  const rel = file.split(path.sep).join("/").replace(/^\.\//, "");
  if (SKIP_FILES.has(rel)) continue;
  const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes("terminology-ok")) return;
    for (const rule of RULES) {
      const m = line.match(rule.pattern);
      if (m) violations.push(`${rel}:${i + 1}: "${m[0]}" — ${rule.fix}`);
    }
  });
}

if (violations.length > 0) {
  console.error("Terminology check failed:");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log("Terminology check passed.");
