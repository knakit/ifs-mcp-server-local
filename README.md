# IFS MCP Server

[![MCP](https://badge.mcpx.dev?type=server)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![IFS Cloud](https://img.shields.io/badge/IFS_Cloud-OAuth_2.0-orange.svg)](https://www.ifs.com/)

Connect Claude to your IFS Cloud instance and interact with your ERP through natural conversation.

---

## The Idea

Connecting an AI assistant to an ERP system like IFS usually means writing custom code for every endpoint — work that requires developers who understand both the API and the AI framework. This server takes a different approach.

Instead of code, you teach Claude using **skills** — plain markdown files that describe how a specific part of IFS works: which endpoints to call, what fields matter, and what the data means in business terms. Claude reads the skill and figures out the rest.

**Anyone who knows their way around IFS can create a skill.** No coding required. You record your workflow in the browser, hand the recording to Claude, answer a few questions about what each step means, and the skill is written and saved automatically.

---

## How It Works

```
CAPTURE  →  Record your actions in IFS using browser DevTools (saves as a .har file)
  ↓
REFINE   →  Claude reads the recording and asks you to explain each step in plain language
  ↓
MAKE     →  Claude drafts the skill file and saves it — available immediately
  ↓
USE      →  Ask Claude anything covered by the skill. It knows exactly how to query IFS.
```

Skills are plain `.md` files. Share them with colleagues via a URL. Import with one command. The server ships with a built-in skill for IFS OData queries — everything else you build yourself, from your own workflows.

→ **[Read the full skill authoring guide](SKILL_AUTHORING_GUIDE.md)**

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Claude Desktop](https://claude.ai/download)
- IFS Cloud instance with a public OAuth 2.0 client (Client ID + Realm)

---

## Setup

**1. Clone and install**
```bash
git clone <repository-url>
cd ifs-mcp-server
npm install
```

**2. Create an OAuth client in IFS Cloud IAM**

You need a public OAuth client in your IFS Cloud instance. If one has already been set up for this tool, skip to step 3.

> If you don't have access to this screen, ask your IFS administrator to create the client for you.

In IFS Cloud, navigate to: **Access Control → Identity and Access Manager → IAM Clients**

1. Click **New** to open the Create New Client dialog
2. Enter a **Client ID** (e.g. `ifs-mcp-server`) and optionally a description
3. Toggle **Enabled** ON
4. Toggle **Public Client** ON — this is the key setting; no secret will be required
5. Under **Redirect Uri**, click **+** and add:
   ```
   http://localhost:3000/oauth/callback
   ```
6. Click **OK** to save

Note the **Client ID** you entered and your **realm name** (ask your administrator if unsure) — you'll need both in the next step.

**3. Configure**
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

> Optional: set `SKILLS_DIR` to keep skills in a separate folder (e.g. a dedicated git repo). See [CONFIGURATION.md](CONFIGURATION.md) for details.

**4. Build**
```bash
# Windows
npx tsc

# macOS / Linux
npm run build
```

**5. Add to Claude Desktop**

Edit `claude_desktop_config.json`:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ifs": {
      "command": "node",
      "args": ["/absolute/path/to/ifs-mcp-server/build/index.js"]
    }
  }
}
```

> To connect to multiple IFS environments simultaneously (e.g. dev and prod), register the server twice with different names and `env` blocks — see [CONFIGURATION.md](CONFIGURATION.md).

**6. Build your first skill**

The server ships with a built-in OData reference guide, but to work with your specific IFS workflows you need to create at least one skill first. Skills teach Claude which endpoints exist, what fields to use, and what the data means.

The fastest way: open IFS Cloud in your browser, do the workflow you want to automate, then export what the browser recorded:

1. Open IFS Cloud and press **F12** to open DevTools → go to the **Network** tab
2. Click the **🚫** button to clear the log, then perform your workflow in IFS
3. Right-click any entry in the Network tab → **Save all as HAR with content**
4. In Claude Desktop, click **+** → select **build_ifs_guide** → provide the path to your `.har` file
5. Answer Claude's questions about what each step means — it will draft and save the skill automatically

→ **[Full step-by-step skill authoring guide](SKILL_AUTHORING_GUIDE.md)**

**7. Authenticate**

Restart Claude Desktop and run `start_oauth`. A browser window opens — log in to IFS and your session is saved automatically.

---

## Documentation

| Document | What's in it |
|----------|--------------|
| [SKILL_AUTHORING_GUIDE.md](SKILL_AUTHORING_GUIDE.md) | How to build, update, and share skills — start here |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute skills, report bugs, or suggest improvements |
| [SECURITY.md](SECURITY.md) | Data handling, responsible use, and vulnerability reporting |
| [IFS_TOOLS_SUMMARY.md](IFS_TOOLS_SUMMARY.md) | Full reference for all tools and prompts |
| [CONFIGURATION.md](CONFIGURATION.md) | Environment variables and advanced setup |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design and component overview |

---

Built with the help of [Claude Code](https://claude.ai/claude-code).
