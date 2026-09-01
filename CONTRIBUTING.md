# Contributing to MCP Server for IFS Cloud

Thank you for your interest in contributing. There are three main ways to help:

1. **Share a skill** — Build a skill for an IFS workflow and submit it so others can use it
2. **Report a bug** — Something isn't working as expected
3. **Suggest an improvement** — An idea for a new feature or a better way to do something

---

## Sharing a Skill

Skills are the most valuable contribution you can make. Every skill you share saves someone else hours of figuring out which IFS endpoints to use and what the fields mean.

### What makes a good contributed skill

- **Focused** — one IFS projection or business area per file (Customer Orders, Purchase Orders, Supplier Invoices, etc.)
- **Business-readable** — written in plain language, not just raw API field names
- **Generic** — no real order numbers, customer IDs, or company-specific data. Use placeholders like `CUST-001`, `ORDER-10001`
- **Tested** — you've actually used it to query your IFS instance

See the [Skill Authoring Guide](docs/guides/SKILL_AUTHORING.md) for the full process of building a skill from scratch.

### How to submit a skill

Community maintained skills can be found in [IFS Skills](https://github.com/knakit/ifs-mcp-skills). Check the contribution guide on making a new skill.

## Reporting a Bug

Open an issue at [GitHub Issues](https://github.com/knakit/ifs-mcp-server-local/issues) and include:

**For authentication issues:**
- Your IFS Cloud version (if known)
- Operating system and Node.js version (`node --version`)
- The error message from Claude Desktop or the MCP server

**For skill or API issues:**
- Which skill file you're using
- The `call_protected_api` call that failed (remove any sensitive data)
- The error response

**For build or setup issues:**
- Operating system
- Node.js version (`node --version`)
- The full error output from `npx tsc` or the server startup

A good bug report includes enough detail for someone else to reproduce the problem without access to your IFS instance.

---

## Suggesting an Improvement

Open an issue and label it **enhancement**. Describe:

- What you're trying to do
- What you'd expect the tool to do
- Why the current behaviour doesn't work for your case

No suggestion is too small. If something feels harder than it should be, it's worth raising.

---

## Code Contributions

For bug fixes or small improvements, open a PR with a clear description of what you changed and why.

For larger changes (new tools, architectural changes), open an issue first to discuss the approach before writing code — this avoids wasted effort if the direction doesn't fit the project.

### Development Setup

If you want to run the server from source (for development or testing changes), follow these steps instead of the standard MCPB installation.

**1. Clone and install**
```bash
git clone https://github.com/knakit/ifs-mcp-server-local
cd ifs-mcp-server-local
npm install
```

**2. Configure**
```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```
Edit `.env`:
```
API_BASE_URL=https://your-instance.ifs.cloud
OAUTH_REALM=your-realm-name
OAUTH_CLIENT_ID=your-client-id
```

**3. Build**
```bash
npm run build
```
(Runs `tsc` plus a resource-copy step. Bare `tsc`/`npx tsc` skips that copy, so `.md` files under `src/resources/` won't reach `build/resources/`.)

**4. Connect it to a client to test against**

Pick whichever host you're testing changes for — both run the same `build/index.js` you just built.

**Claude Desktop** — edit `claude_desktop_config.json`:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ifs": {
      "command": "node",
      "args": ["/absolute/path/to/ifs-mcp-server-local/build/index.js"]
    }
  }
}
```

You can also pass environment variables directly in the config instead of using `.env`:
```json
{
  "mcpServers": {
    "ifs": {
      "command": "node",
      "args": ["/absolute/path/to/ifs-mcp-server-local/build/index.js"],
      "env": {
        "API_BASE_URL": "https://your-instance.ifs.cloud",
        "OAUTH_REALM": "your-realm-name",
        "OAUTH_CLIENT_ID": "your-client-id"
      }
    }
  }
}
```

**Claude Code** — the repo already ships `.mcp.json` and `.claude-plugin/`, so no manual config file editing is needed:

```bash
cd ifs-mcp-server-local
claude --plugin-dir . --mcp-config .\.mcp.json   # session-only, run /reload-plugins after edits
```
(`--mcp-config` is required alongside `--plugin-dir` — see [anthropics/claude-code#15308](https://github.com/anthropics/claude-code/issues/15308).) For a persistent install instead: `claude plugin marketplace add .` then `claude plugin install ifs-mcp-server@ifs-local`.

**Codex CLI** — no packaging involved, just a direct registration:
```bash
codex mcp add ifs -- node /absolute/path/to/ifs-mcp-server-local/build/index.js
```
Re-run after rebuilding — Codex doesn't hot-reload a changed binary path.

### Before submitting a PR

- [ ] `npx tsc` compiles without errors
- [ ] Existing skills in `src/resources/` still load correctly
- [ ] No secrets or credentials in any committed file

---

## Questions

If you're unsure whether something is a bug or just unexpected behaviour, or if you want to check whether a skill idea is a good fit before building it — open a Discussion or Issue. Happy to help.
