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
                    │                        │     Request Handlers      │
                    │                        │  • ListTools / CallTool   │
                    │                        │  • ListResources / Read   │
                    │                        └───────────┬───────────────┘
                    │                                    │
                    │                        ┌───────────▼───────────────┐
                    │                        │  Tool Registry            │
                    │                        │  ┌─────────────────────┐  │
                    │                        │  │  start_oauth        │  │
                    │                        │  │  get_session_info   │  │
                    │                        │  │  call_protected_api │  │
                    │                        │  │  get_api_guide      │  │
                    │                        │  │  export_api_data    │  │
                    │                        │  │  import_skill       │  │
                    │                        │  │  save_skill         │  │
                    │                        │  └─────────────────────┘  │
                    │                        │                           │
                    │                        │  Prompt Registry          │
                    │                        │  ┌─────────────────────┐  │
                    │                        │  │  build_ifs_guide    │  │
                    │                        │  └─────────────────────┘  │
                    │                        │                           │
                    │                        │  Resource Registry        │
                    │                        │  ┌─────────────────────┐  │
                    │                        │  │  auto-discovered    │  │
                    │                        │  │  SKILLS_DIR/ (opt.) │  │
                    │                        │  │  build/resources/   │  │
                    │                        │  │  *.md (hot-reload)  │  │
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
MCP protocol handler. Registers tool, resource, and prompt definitions. Routes tool calls to handlers, serves resource content on read requests, and executes prompt handlers that return structured conversation messages.

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
`API_BASE_URL`, `OAUTH_REALM`, `OAUTH_CLIENT_ID`, `SKILLS_DIR` (optional)

### 7. Tools

| Tool | Category | Description |
|------|----------|-------------|
| `start_oauth` | Auth | Initiate OAuth flow |
| `get_session_info` | Auth | Check session status |
| `call_protected_api` | API | Generic authenticated API calls |
| `get_api_guide` | API | Retrieve API guide for a specific IFS projection |
| `export_api_data` | API | Export large result sets to CSV with automatic pagination |
| `import_skill` | Skills | Import a skill `.md` from a URL or local file path |
| `save_skill` | Skills | Save or update a skill `.md`; returns a change diff for updates |

### 8. Prompts

MCP prompts are guided conversation starters available in Claude Desktop's `+` menu. They accept arguments and return structured messages that set up a specific workflow.

| Prompt | Description |
|--------|-------------|
| `build_ifs_guide` | Parses a HAR file and guides the user through building a new skill |

The `build_ifs_guide` prompt accepts a `har_file_path` argument. At invocation time it calls the HAR parser (`src/lib/har-parser.ts`), formats the results, and injects the parsed summary plus workflow instructions into the conversation as the opening message.

### 9. Resources

MCP resources provide API guides as markdown that Claude reads to learn how to construct `call_protected_api` calls for specific IFS projections.

| Resource | URI | Description |
|----------|-----|-------------|
| IFS OData Reference | `ifs://ifs-common-odata-reference/guide` | OData query syntax reference for IFS Cloud projections |

Resources are scanned fresh on every request (`getResources()` called per `ListResources` / `ReadResource` / `get_api_guide`). Two directories are scanned: `SKILLS_DIR` (if set, takes precedence) and `build/resources/` (always scanned — bundled OData reference lives here). Adding, updating, or removing a `.md` file takes effect immediately — no server restart needed. Metadata is derived from file content: `# Heading` becomes the name, first paragraph becomes the description, filename becomes the URI slug.

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

### Skill Authoring (Capture → Refine → Make → Use)
```
1. CAPTURE
   User works in IFS Cloud browser UI
   DevTools Network tab ──export──> .har file

2. REFINE
   User invokes build_ifs_guide prompt (+ menu in Claude Desktop)
   MCP prompt handler ──parseHar()──> filtered operation groups
   Claude presents summary ──asks clarifying questions──> User answers

3. MAKE
   Claude drafts .md guide ──asks for filename──> calls save_skill()
   save_skill writes to SKILLS_DIR/ (if set) or build/resources/
   (update path: reads old file ──diff──> returns change summary)

4. USE
   Next get_api_guide call ──getResources() scans dir──> skill available immediately
   No restart needed
   Share: copy .md URL ──recipient runs──> import_skill({ source: url })
```

## Design Decisions

1. **Dual Server Architecture** - Express for browser OAuth callbacks + MCP stdio for Claude Desktop. Both in one process.
2. **Session Persistence** - Sessions survive restarts via `~/.ifs-mcp/session.json`. LLM doesn't need to track session IDs. Refreshed tokens are also persisted so sessions continue seamlessly after restarts.
3. **Automatic Token Refresh** - Transparent to LLM. 5-minute expiry buffer in `getAccessToken()`.
4. **Modular Tool Design** - Each tool exports `definition` + `handler`. Registered in `tools/index.ts`.
5. **Resource-Driven API Knowledge** - Instead of hardcoding tools per endpoint, API guides (markdown) teach the LLM how to use `call_protected_api`. Users can add new guides without code changes.
6. **HAR-Based Skill Authoring** - Skills are built from real browser traffic (HAR files) rather than schema introspection. This captures what users actually do, not what the API theoretically supports. The `build_ifs_guide` prompt drives a guided conversation to add business context before writing anything.
7. **Portable Skills** - Skill files are plain markdown. Export = share the file. Import = `import_skill` tool. No registry or special format needed.
8. **Security** - Public OAuth client with PKCE (no client secret), CSRF state parameter, HTTPS-only remote skill imports, path traversal protection on skill writes, tokens stored locally.

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
│   ├── index.ts                      # Prompt registry
│   └── build-ifs-guide.ts            # HAR → skill guided workflow
├── resources/
│   ├── index.ts                      # Resource registry (auto-discovery)
│   └── ifs-common-odata-reference.md # Bundled OData syntax reference
├── server/
│   ├── mcp-server.ts                 # MCP protocol handler
│   └── oauth-callback-server.ts      # Express OAuth callback
└── tools/
    ├── index.ts                      # Tool registry
    ├── auth/
    │   ├── start-oauth.ts            # Start OAuth flow
    │   └── get-session-info.ts       # Check session status
    └── api/
        ├── call-protected-api.ts     # Generic API calls
        ├── get-api-guide.ts          # Retrieve API guides from resources
        ├── export-api-data.ts        # Paginated CSV export
        ├── import-skill.ts           # Import skill from URL or file
        └── save-skill.ts             # Save/update skill with change diff
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP protocol implementation |
| `express` | OAuth callback HTTP server |
| `axios` | HTTP client for API calls |
| `dotenv` | Environment variable management |
| `zod` | Schema validation |
| `crypto` | PKCE generation (Node.js built-in) |
