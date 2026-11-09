// Enforce that only the authentication path can read a client secret.
//
//  - getClientSecret() is defined in src/lib/config.ts and may be called only from
//    src/lib/auth/oauth-manager.ts (clientCredentialsToken).
//  - Dynamic environment lookups (process.env[...]) — how the IFS_CLIENT_SECRET_<NAME>
//    variable is read — may appear only in src/lib/config.ts.
//
// Comment-only lines are ignored; this checks code, not documentation.
//
// Usage: node scripts/check-secret-access.mjs
import fs from "fs";
import path from "path";

const RULES = [
  {
    pattern: /getClientSecret\b/,
    allowed: new Set(["src/lib/config.ts", "src/lib/auth/oauth-manager.ts"]),
    why: "getClientSecret() may only be used by the authentication path",
  },
  {
    pattern: /process\.env\[/,
    allowed: new Set(["src/lib/config.ts"]),
    why: "dynamic process.env[...] lookups (where the client secret env var is read) belong in config.ts only",
  },
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const isCommentLine = (line) => /^\s*(\/\/|\/\*|\*)/.test(line);

const violations = [];
for (const file of walk("src").filter((f) => f.endsWith(".ts"))) {
  const rel = file.split(path.sep).join("/");
  const codeLines = fs.readFileSync(file, "utf-8").split("\n").filter((line) => !isCommentLine(line));
  for (const rule of RULES) {
    if (!rule.allowed.has(rel) && codeLines.some((line) => rule.pattern.test(line))) {
      violations.push(`${rel}: ${rule.why}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Client secret accessed outside the authentication path:");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log("Client secret access is confined to config.ts and oauth-manager.ts.");
