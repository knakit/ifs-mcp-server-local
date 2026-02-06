# IFS MCP Server

A Model Context Protocol (MCP) server that connects Claude Desktop to IFS Cloud Quick Reports via OAuth 2.0 authentication.

## Features

- Authenticates with IFS Cloud using OAuth 2.0 + PKCE
- Exposes IFS Quick Reports as MCP tools that Claude can call directly
- Persists sessions across restarts so you only authenticate once

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Claude Desktop](https://claude.ai/download) installed
- IFS Cloud instance with OAuth 2.0 credentials

## Quick Start (Windows)

1. Clone and install dependencies:
   ```cmd
   git clone <repository-url>
   cd ifs-mcp-server
   npm install
   ```

2. Create your environment file:
   ```cmd
   copy .env.example .env
   ```
   Edit `.env` with your IFS Cloud credentials:
   ```
   API_BASE_URL=https://your-instance.ifs.cloud
   OAUTH_REALM=your-realm-name
   OAUTH_CLIENT_ID=your-client-id
   OAUTH_CLIENT_SECRET=your-client-secret
   ```

3. Build the project:
   ```cmd
   npx tsc
   ```

4. Add to Claude Desktop config at:
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```
   ```json
   {
     "mcpServers": {
       "ifs": {
         "command": "node",
         "args": ["C:\\Users\\YourUsername\\projects\\ifs-mcp-server\\build\\index.js"]
       }
     }
   }
   ```

5. Restart Claude Desktop and use the `start_oauth` tool to authenticate.

## Quick Start (Linux / macOS)

1. Clone and install dependencies:
   ```bash
   git clone <repository-url>
   cd ifs-mcp-server
   npm install
   ```

2. Create your environment file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your IFS Cloud credentials:
   ```
   API_BASE_URL=https://your-instance.ifs.cloud
   OAUTH_REALM=your-realm-name
   OAUTH_CLIENT_ID=your-client-id
   OAUTH_CLIENT_SECRET=your-client-secret
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Add to Claude Desktop config at:

   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "ifs": {
         "command": "node",
         "args": ["/home/yourusername/projects/ifs-mcp-server/build/index.js"]
       }
     }
   }
   ```

5. Restart Claude Desktop and use the `start_oauth` tool to authenticate.

## Available Tools

| Tool | Description |
|------|-------------|
| `start_oauth` | Initiate OAuth login flow |
| `get_session_info` | Check current session status |
| `call_protected_api` | Make authenticated API calls to any IFS endpoint |
| `search_quick_reports` | Search reports by description |
| `get_report_parameters` | Get required parameters for a report |
| `execute_quick_report` | Execute a report with parameters |
| `list_report_categories` | List available report categories |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_BASE_URL` | Base URL for your IFS Cloud instance | Yes |
| `OAUTH_REALM` | Keycloak realm name | Yes |
| `OAUTH_CLIENT_ID` | OAuth 2.0 client ID | Yes |
| `OAUTH_CLIENT_SECRET` | OAuth 2.0 client secret | Yes |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System design, components, and data flow
- [CONFIGURATION.md](CONFIGURATION.md) - Environment variables and setup
- [IFS_TOOLS_SUMMARY.md](IFS_TOOLS_SUMMARY.md) - Tool usage and API reference

---

Built with the help of [Claude Code](https://claude.ai/claude-code).
