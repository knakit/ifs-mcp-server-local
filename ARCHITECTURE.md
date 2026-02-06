# IFS MCP Server - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Claude Desktop Client                          │
│                     (Communicates via JSON-RPC/stdio)                   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ JSON-RPC over stdio
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                           MCP Server (index.ts)                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     Initialization Layer                          │  │
│  │  • Load dotenv config                                             │  │
│  │  • Initialize OAuthManager                                        │  │
│  │  • Load saved sessions from disk                                  │  │
│  │  • Start OAuth Callback Server (Express)                          │  │
│  │  • Start MCP Server (stdio transport)                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    │                                    │
        ┌───────────▼────────────┐          ┌────────────▼──────────────┐
        │  OAuth Callback Server │          │   MCP Server Component    │
        │   (Express on :3000)   │          │   (StdioServerTransport)  │
        └────────────────────────┘          └───────────────────────────┘
                    │                                    │
                    │                        ┌───────────▼───────────────┐
                    │                        │   Tool Request Handler    │
                    │                        │  • ListTools              │
                    │                        │  • CallTool               │
                    │                        └───────────┬───────────────┘
                    │                                    │
                    │                        ┌───────────▼───────────────┐
                    │                        │    Tool Registry          │
                    │                        │  ┌─────────────────────┐  │
                    │                        │  │ Auth:               │  │
                    │                        │  │  start_oauth        │  │
                    │                        │  │  get_session_info   │  │
                    │                        │  │ API:                │  │
                    │                        │  │  call_protected_api │  │
                    │                        │  │ IFS Quick Reports:  │  │
                    │                        │  │  search_quick_rpts  │  │
                    │                        │  │  get_report_params  │  │
                    │                        │  │  execute_quick_rpt  │  │
                    │                        │  │  list_report_cats   │  │
                    │                        │  └─────────────────────┘  │
                    │                        └───────────┬───────────────┘
                    │                                    │
                    │                                    │
        ┌───────────▼────────────────────────────────────▼───────────────┐
        │                    Authentication Layer                        │
        │  ┌──────────────────────────────────────────────────────────┐  │
        │  │              OAuthManager (oauth-manager.ts)             │  │
        │  │  • startAuthFlow() - Generate PKCE & auth URL            │  │
        │  │  • exchangeCode() - Trade code for tokens                │  │
        │  │  • refreshAccessToken() - Refresh expired tokens         │  │
        │  │  • getAccessToken() - Get valid token (auto-refresh)     │  │
        │  └──────────────────────────────────────────────────────────┘  │
        │                                                                │
        │  ┌──────────────────────────────────────────────────────────┐  │
        │  │          Session Manager (session-manager.ts)            │  │
        │  │  • loadSessions() - Load from ~/.ifs-mcp/session.json    │  │
        │  │  • saveSession() - Persist session to disk               │  │
        │  │  • getCurrentSessionId() - Get latest session            │  │
        │  │  • initializeTokenStore() - Restore sessions on startup  │  │
        │  └──────────────────────────────────────────────────────────┘  │
        │                                                                │
        │  ┌──────────────────────────────────────────────────────────┐  │
        │  │            Token Store (token-store.ts)                  │  │
        │  │  • In-memory Map<sessionId, TokenData>                   │  │
        │  │  • Stores: accessToken, refreshToken, expiresAt, userId  │  │
        │  └──────────────────────────────────────────────────────────┘  │
        └────────────────────────────────────────────────────────────────┘
                    │                                    │
                    │                                    │
        ┌───────────▼────────────┐           ┌───────────▼───────────────┐
        │  OAuth Provider        │           │   Protected API Server    │
        │  (IFS Cloud/Keycloak)  │           │   (IFS Cloud REST API)    │
        │  • Authorization       │           │   • Business endpoints    │
        │  • Token Exchange      │           │   • Requires Bearer token │
        │  • Token Refresh       │           │                           │
        └────────────────────────┘           └───────────────────────────┘
```

## Components

### 1. Entry Point (`src/index.ts`)
Application bootstrap: loads env vars, initializes OAuthManager, restores saved sessions, starts Express (port 3000) and MCP (stdio) servers concurrently.

### 2. MCP Server (`src/server/mcp-server.ts`)
MCP protocol handler. Registers tool definitions, routes tool calls to handlers, passes OAuthManager to all tools.

### 3. OAuth Callback Server (`src/server/oauth-callback-server.ts`)
Express server on `http://localhost:3000`. Handles `/oauth/callback` redirects, exchanges auth codes for tokens, saves sessions to disk.

### 4. API Client (`src/lib/api-client.ts`)
Authenticated HTTP client. Constructs `API_BASE_URL + endpoint`, attaches Bearer token, used by all tools.

### 5. Authentication Layer

**OAuth Manager** (`src/lib/auth/oauth-manager.ts`) - OAuth 2.0 + PKCE flow orchestration with automatic token refresh (5-minute buffer).

**Session Manager** (`src/lib/auth/session-manager.ts`) - Persists sessions to `~/.ifs-mcp/session.json`, restores on startup.

**Token Store** (`src/lib/auth/token-store.ts`) - In-memory `Map<sessionId, TokenData>`.

### 6. Configuration (`src/lib/types.ts`)
All config via environment variables (see `CONFIGURATION.md`):
`API_BASE_URL`, `OAUTH_REALM`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`

### 7. Tools
See `IFS_TOOLS_SUMMARY.md` for detailed tool documentation.

| Tool | Category | Description |
|------|----------|-------------|
| `start_oauth` | Auth | Initiate OAuth flow |
| `get_session_info` | Auth | Check session status |
| `call_protected_api` | API | Generic authenticated API calls |
| `search_quick_reports` | IFS | Search reports by description |
| `get_report_parameters` | IFS | Get required report parameters |
| `execute_quick_report` | IFS | Execute a report |
| `list_report_categories` | IFS | List report categories |

## Data Flow

### OAuth Authentication
```
LLM ──start_oauth──> MCP Server ──generate PKCE──> Return authUrl
User opens URL in browser ──> OAuth Provider ──authenticates──> Redirect to localhost:3000
Express Server ──exchange code──> OAuth Provider ──returns tokens──> Save to store & disk
```

### API Call (with Auto-Refresh)
```
LLM ──tool call──> MCP Server ──get session──> Session Manager
  ──get token──> Token Store ──expired?──> Refresh with OAuth Provider
  ──valid token──> axios ──Bearer auth──> IFS Cloud API ──response──> LLM
```

## Design Decisions

1. **Dual Server Architecture** - Express for browser OAuth callbacks + MCP stdio for Claude Desktop. Both in one process.
2. **Session Persistence** - Sessions survive restarts via `~/.ifs-mcp/session.json`. LLM doesn't need to track session IDs.
3. **Automatic Token Refresh** - Transparent to LLM. 5-minute expiry buffer in `getAccessToken()`.
4. **Modular Tool Design** - Each tool exports `definition` + `handler`. Registered in `tools/index.ts`.
5. **Security** - PKCE, CSRF state parameter, secrets in env vars, tokens stored locally.

## File Structure
```
src/
├── index.ts                          # Entry point
├── lib/
│   ├── types.ts                      # Types & config
│   ├── api-client.ts                 # Authenticated HTTP client
│   └── auth/
│       ├── oauth-manager.ts          # OAuth flow logic
│       ├── session-manager.ts        # Session persistence
│       └── token-store.ts            # In-memory storage
├── prompts/
│   └── index.ts                      # MCP prompts (placeholder)
├── resources/
│   └── index.ts                      # MCP resources (placeholder)
├── server/
│   ├── mcp-server.ts                 # MCP protocol handler
│   └── oauth-callback-server.ts      # Express OAuth callback
└── tools/
    ├── index.ts                      # Tool registry
    ├── auth/
    │   ├── start-oauth.ts            # Start OAuth flow
    │   └── get-session-info.ts       # Check session status
    ├── api/
    │   └── call-protected-api.ts     # Generic API calls
    └── ifs-quick-reports/
        ├── search-quick-reports.ts   # Search reports by description
        ├── get-report-parameters.ts  # Get report parameter definitions
        ├── execute-quick-report.ts   # Execute a report
        └── list-report-categories.ts # List report categories
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP protocol implementation |
| `express` | OAuth callback HTTP server |
| `axios` | HTTP client for API calls |
| `dotenv` | Environment variable management |
| `crypto` | PKCE generation (Node.js built-in) |
