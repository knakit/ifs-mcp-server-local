# Installation

## Prerequisites

- [Claude Desktop](https://claude.ai/download)
- An IFS Cloud instance with a public OAuth 2.0 client (Client ID + Realm)

---

## Step 1 — Create an OAuth Client in IFS Cloud

You need a public OAuth client in your IFS Cloud instance. If one has already been set up for this tool, skip to Step 2.

> If you don't have access to the IAM screen, ask your IFS administrator to create the client for you.

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

![IFS IAM Client Setup](../images/ifs-iam-client-setup.png)

---
## Step 2 - Create the skills directory
Create a folder in your PC to save the skill files.

> [!TIP]
> Community maintained skills can be found in the github repository [IFS Skills](https://github.com/knakit/ifs-mcp-skills). You can download them and use the skill folder. 

## Step 3 — Install the Extension

Download the latest `ifs-mcp-server.mcpb` from the [GitHub Releases](https://github.com/knakit/ifs-mcp-server-local/releases) page.

**Install in Claude Desktop:**

1. Open **Claude Desktop**
2. Go to **Settings → Extensions → Advanced settings**
3. Click **Install Extension** and select the downloaded `.mcpb` file
4. When prompted, enter:
   - **IFS Cloud URL** — IFS instance URL (e.g. `https://your-tenant.ifs.cloud`)
   - **OAuth Realm** — IFS namespace. You can find it in Solution Manager → Setup → System Parameters → Parameter = Namespace
   - **OAuth Client ID** — The client ID from Step 1
5. Click **Install**

![Installing IFS MCP Server in Claude Desktop](../images/clade-desktop-install-ifs-mcpb.gif)

> **Optional:** Set the **Skills Directory** to keep skills in a separate folder (e.g. a shared git repo). See [CONFIGURATION.md](CONFIGURATION.md) for details.

---

## Step 4 — Authenticate

1. In Claude Desktop, ask Claude to login to IFS. *(Yes, it's that simple!)*
2. A browser window opens — log in with your IFS Cloud credentials
3. After successful login, the browser shows a confirmation and you can close it.
4. Say ```done``` or something similar to let Claude know you have completed the login.

**Verify it worked:**

Ask Claude: *Check the IFS session status*

Claude will show the session information and the status.

---

## Step 5 — Build Your First Skill

The server ships with a built-in OData reference guide, but to work with your specific IFS workflows you need to create at least one skill. Skills teach Claude which endpoints exist, what fields to use, and what the data means.

**Quick start — build from OpenAPI spec:**

The simplest path for master data projections. Just know the projection name and use the `build_ifs_skill_from_projection` prompt.

![Buils skill from Projection name](../images/claude-create-skill-projection.gif)


Example prompt inputs:
- Projection name: `SupplierHandling` → skill name: `ifs-procurement-suppliers`
- Projection name: `CustomerHandling` → skill name: `ifs-sales-customers`

Claude fetches the spec from your IFS instance, asks a few questions about what the fields mean, and saves the skill automatically.

Once the skill file is created, you can ask questions in natural language.

Eg:

```Show me IFS suppliers with name ABC Corp```

```
Create a new supplier in IFS
Name: XYZ Corp
Country: USA
Language: English
```
Easy as that!

---

## Next Steps

- [Skill Authoring Guide](../guides/SKILL_AUTHORING.md) — learn how to build skills from HAR recordings and OpenAPI specs
- [Configuration](CONFIGURATION.md) — set up a persistent skills directory
- [Tools Reference](../reference/TOOLS.md) — full reference for all available tools and prompts
