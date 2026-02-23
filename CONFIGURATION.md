# Configuration Guide

## Environment Variables

This MCP server uses environment variables for configuration. You can set them using a `.env` file.

### Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your IFS Cloud instance details:
   ```bash
   # IFS Cloud Configuration
   API_BASE_URL=https://your-instance.ifs.cloud
   OAUTH_REALM=your-realm-name

   # OAuth 2.0 Public Client (no client secret required)
   OAUTH_CLIENT_ID=your-client-id
   ```

### Available Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_BASE_URL` | Base URL for your IFS Cloud instance (e.g., `https://your-instance.ifs.cloud`) | Yes |
| `OAUTH_REALM` | Keycloak realm name | Yes |
| `OAUTH_CLIENT_ID` | OAuth 2.0 client ID | Yes |
| `SKILLS_DIR` | Absolute path to a directory of skill `.md` files. Skills are read from and written to this path. If not set, `build/resources/` is used. | No |

### Separate Skills Directory

Setting `SKILLS_DIR` lets you keep skills in a separate location — for example, a dedicated git repository shared across your team:

```bash
SKILLS_DIR=/path/to/ifs-skills-repo
```

When set:
- `get_api_guide` and `list resources` scan `SKILLS_DIR` **and** `build/resources/` (bundled OData reference stays available)
- `save_skill` and `import_skill` write to `SKILLS_DIR`
- Skills in `SKILLS_DIR` take precedence over same-named files in `build/resources/`
- The directory must already exist — the server will not create it

### Security Notes

- **Never commit `.env` to version control**
- The `.env.example` file is safe to commit as a template
- `.env` is already in `.gitignore`
- This tool uses a **public OAuth client** with PKCE — no client secret is required or stored

### Multiple Environments (Dev / Prod)

The recommended way to connect to multiple IFS environments — for example, a test environment and a production environment — is to register the server **twice** in `claude_desktop_config.json` under different names, each with its own `env` block.

No code changes are needed. The existing environment variable system handles it.

**Example `claude_desktop_config.json`:**
```json
{
  "mcpServers": {
    "ifs-prod": {
      "command": "node",
      "args": ["/absolute/path/to/ifs-mcp-server/build/index.js"],
      "env": {
        "API_BASE_URL": "https://prod.ifs.cloud",
        "OAUTH_REALM": "prod-realm",
        "OAUTH_CLIENT_ID": "ifs-mcp-prod",
        "SKILLS_DIR": "/path/to/skills"
      }
    },
    "ifs-dev": {
      "command": "node",
      "args": ["/absolute/path/to/ifs-mcp-server/build/index.js"],
      "env": {
        "API_BASE_URL": "https://dev.ifs.cloud",
        "OAUTH_REALM": "dev-realm",
        "OAUTH_CLIENT_ID": "ifs-mcp-dev",
        "SKILLS_DIR": "/path/to/skills"
      }
    }
  }
}
```

**How it works:**
- Both environments are available simultaneously — no restart or switching needed
- In Claude Desktop, tools are prefixed by server name: `ifs-prod` tools vs `ifs-dev` tools
- Tell Claude which to use: *"use ifs-dev to check this order"* or *"run this against ifs-prod"*
- Each server authenticates independently — dev and prod sessions are completely separate
- Point both `SKILLS_DIR` values to the same folder and skills are shared across both environments

**Notes:**
- When using this approach, the `.env` file is optional — env vars in `claude_desktop_config.json` take precedence
- Each environment needs its own OAuth client in IFS Cloud IAM
- Each environment maintains its own session file: tokens for `ifs-dev` and `ifs-prod` do not mix

### Alternative Configuration Methods

You can also set environment variables:

**Command Line:**
```bash
API_BASE_URL=https://prod.ifs.cloud node build/index.js
```

**Shell Export:**
```bash
export API_BASE_URL=https://prod.ifs.cloud
node build/index.js
```
