# Configuration

Core settings (IFS Cloud URL, OAuth Realm, Client ID) are entered when you install the extension in Claude Desktop. This page covers the one optional setting: the Skills Directory.

---

## Skills Directory

By default, skills are stored inside the extension bundle. **This means they will be lost when the extension is updated.**

To keep your skills permanently, set the **Skills Directory** to a folder on your machine (or a shared git repository) before you start creating skills.

**How to set it:**

1. In Claude Desktop, go to **Settings → Extensions → IFS Cloud MCP Server**
2. Set **Skills Directory** to an absolute path, for example:
   - Windows: `C:\Users\you\Documents\ifs-skills`
   - macOS: `/Users/you/Documents/ifs-skills`
3. The folder must already exist — create it first if needed

**What changes when it's set:**

- `save_skill` and `import_skill` write to your folder instead of inside the bundle
- `get_api_guide` scans both your folder and the built-in resources — the bundled OData reference remains available
- Skills in your folder take precedence over same-named built-in files
- You can version-control or share the folder across your team

---

## Security Notes

- This tool uses a **public OAuth client** with PKCE — no client secret is required or stored
- Session tokens are stored locally in `~/.ifs-mcp/session.json`
- See [SECURITY.md](../../SECURITY.md) for full data handling details
