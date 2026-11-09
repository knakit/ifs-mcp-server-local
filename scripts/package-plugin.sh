#!/usr/bin/env bash
# Build the plugin zip: a self-contained folder (.claude-plugin/, .mcp.json,
# build/, production node_modules) that Claude Code, Cowork, Codex and other
# MCP clients can run without cloning or building. Run `npm run build` first.
#
# Usage: scripts/package-plugin.sh [output.zip]
set -euo pipefail

cd "$(dirname "$0")/.."

OUT="${1:-ifs-mcp-server-plugin.zip}"
OUT_ABS="$PWD/$OUT"
STAGE="dist-plugin"
MAX_BYTES=$((50 * 1024 * 1024)) # Cowork's plugin upload limit

if [ ! -f build/index.js ]; then
  echo "build/index.js not found — run 'npm run build' first." >&2
  exit 1
fi

rm -rf "$STAGE" "$OUT_ABS"
mkdir -p "$STAGE"
cp -r .claude-plugin .mcp.json package.json package-lock.json build "$STAGE"/

(cd "$STAGE" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund)

# Cowork's zip upload rejects paths containing '@', which every scoped npm package
# has (node_modules/@modelcontextprotocol/...). Move the SDK to an unscoped folder
# and point the staged build output at it. Staging copy only — the repo is untouched.
SDK_SCOPED="@modelcontextprotocol/sdk"
SDK_UNSCOPED="mcp-sdk"
mv "$STAGE/node_modules/$SDK_SCOPED" "$STAGE/node_modules/$SDK_UNSCOPED"
rmdir "$STAGE/node_modules/@modelcontextprotocol"
find "$STAGE/build" -name '*.js' -print0 | xargs -0 sed -i "s#$SDK_SCOPED/#$SDK_UNSCOPED/#g"
if grep -rq "$SDK_SCOPED" "$STAGE/build"; then
  echo "Staged build still references $SDK_SCOPED after rewrite." >&2
  exit 1
fi

# Trim files that are never loaded at runtime. This package is ESM-only, so the
# MCP SDK's CommonJS build, source maps, TypeScript sources and docs are dead weight.
rm -rf "$STAGE/node_modules/$SDK_UNSCOPED/dist/cjs" "$STAGE/node_modules/zod/src"
find "$STAGE/node_modules" -type f \( -name '*.map' -o -iname 'README*' -o -iname 'CHANGELOG*' -o -iname 'HISTORY*' \) -delete

# npm can leave empty directories behind (e.g. node_modules/@types when only dev
# dependencies live under that scope). They aren't shipped, so drop them before the check.
find "$STAGE" -type d -empty -delete

# Fail early on any path Cowork's uploader may reject (it reports "invalid characters").
UNSAFE=$(cd "$STAGE" && find . -print | grep -E '[^A-Za-z0-9._/-]' || true)
if [ -n "$UNSAFE" ]; then
  echo "Paths with characters outside [A-Za-z0-9._/-] (e.g. a new scoped npm package):" >&2
  echo "$UNSAFE" | head -10 >&2
  exit 1
fi

if command -v zip >/dev/null 2>&1; then
  (cd "$STAGE" && zip -qr "$OUT_ABS" .)
else
  # No zip binary (e.g. Git Bash on Windows). Git Bash's tar is GNU tar, which
  # silently writes a tar file even for -a/.zip — so use Python's zipfile instead.
  # Probe by running it: on Windows, `python3` can be a Store stub that exists but fails.
  PY=""
  for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c "import zipfile" >/dev/null 2>&1; then
      PY="$candidate"
      break
    fi
  done
  if [ -z "$PY" ]; then
    echo "Need 'zip' or Python installed to create the plugin zip." >&2
    exit 1
  fi
  "$PY" - "$STAGE" "$OUT_ABS" <<'PYEOF'
import os, sys, zipfile
stage, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(stage):
        for name in files:
            full = os.path.join(root, name)
            z.write(full, os.path.relpath(full, stage).replace(os.sep, "/"))
PYEOF
fi

SIZE=$(wc -c < "$OUT_ABS")
echo "Created $OUT ($((SIZE / 1024 / 1024)) MB, $SIZE bytes)"
if [ "$SIZE" -gt "$MAX_BYTES" ]; then
  echo "Plugin zip exceeds the 50 MB upload limit." >&2
  exit 1
fi
