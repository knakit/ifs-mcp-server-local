# Configuration

Core settings (IFS Cloud URL, OAuth Realm, Client ID) — and, if you need more than one IFS instance or headless `client_credentials` auth, named environments — are covered in **[Managing IFS Environments](ENVIRONMENTS.md)**. This page covers the one remaining optional setting: the Skills Directory.

---

## Skills Directory

By default, skills are stored inside the server's own bundle. **This means they will be lost when it's updated** (a new `.mcpb` install, or a plugin update).

To keep your skills permanently, set the Skills Directory to a folder on your machine (or a shared git repository) before you start creating skills.

**How to set it — Claude Desktop:**

1. Go to **Settings → Extensions → MCP Server for IFS Cloud**
2. Set **Skills Directory** to an absolute path, for example:
   - Windows: `C:\Users\you\Documents\ifs-skills`
   - macOS: `/Users/you/Documents/ifs-skills`
3. The folder must already exist — create it first if needed

**How to set it — Claude Code:**

There's no settings dialog, so set the `SKILLS_DIR` environment variable before launching `claude` (e.g. in your shell profile). Don't rely on editing the plugin's own `.mcp.json`: a plugin update replaces it.

**What changes when it's set:**

- `save_skill` and `import_skill` write to your folder instead of inside the bundle
- `get_api_guide` scans both your folder and the built-in resources — the bundled guides (client navigator, quick reports, OData reference, skill authoring) remain available
- Skills in your folder take precedence over same-named built-in files
- You can version-control or share the folder across your team

---

