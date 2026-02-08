# IFS MCP Server

[![MCP](https://badge.mcpx.dev?type=server)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![IFS Cloud](https://img.shields.io/badge/IFS_Cloud-OAuth_2.0-orange.svg)](https://www.ifs.com/)

A Model Context Protocol (MCP) server that provides authenticated access to IFS Cloud APIs via OAuth 2.0. Uses a resource-driven architecture where API guides teach Claude how to construct calls using a single generic tool.

## Features

- Authenticates with IFS Cloud using OAuth 2.0 + PKCE
- Generic `call_protected_api` tool for any IFS endpoint
- MCP resources provide API guides (e.g., IFS Quick Reports) that Claude reads to construct correct calls
- Extensible: add your own resource guides for other IFS projections
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
| `get_api_guide` | Retrieve API guide for a specific IFS projection |
| `export_api_data` | Export large result sets to CSV with automatic pagination |

## Resources

Resources are API guides that Claude reads to learn how to use `call_protected_api` for specific IFS projections.

| Resource | URI | Description |
|----------|-----|-------------|
| IFS Quick Reports | `ifs://quick-reports/guide` | Search, list, execute Quick Reports via OData |

### Adding Your Own Resources

To add a guide for another IFS projection:

1. Create a markdown file in `src/resources/` (e.g., `purchase-orders.md`)
   - Start with a `# Heading` (becomes the resource name)
   - First paragraph becomes the description
   - Filename becomes the URI slug (e.g., `purchase-orders.md` → `ifs://purchase-orders/guide`)
2. Rebuild with `npm run build`

Resources are auto-discovered — no code changes needed.

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
