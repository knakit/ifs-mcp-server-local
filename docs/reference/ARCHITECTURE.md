# IFS MCP Server - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│         MCP Client — Claude Desktop, Claude Code, or Codex CLI          │
│   Same server binary every time; hosts differ only in how they launch  │
│   it — .mcpb manifest.json / .claude-plugin/+.mcp.json / codex mcp add  │
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
│  │  • Start MCP Server (stdio transport)                             │  │
│  │  (OAuth Callback Server starts later, on-demand — see below)      │  │
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
                    │                        │  │  add_ifs_environment│  │
                    │                        │  │  list_ifs_environ.  │  │
                    │                        │  │  use_ifs_environment│  │
                    │                        │  │  remove_ifs_environ.│  │
                    │                        │  │  start_oauth        │  │
                    │                        │  │  get_session_info   │  │
                    │                        │  │  call_protected_api │  │
                    │                        │  │  get_api_guide      │  │
                    │                        │  │  export_api_data    │  │
                    │                        │  │  import_skill       │  │
                    │                        │  │  save_skill         │  │
                    │                        │  │  parse_har_file     │  │
                    │                        │  │  read_openapi_file  │  │
                    │                        │  └─────────────────────┘  │
                    │                        │                           │
                    │                        │  Prompt Registry          │
                    │                        │  ┌─────────────────────┐  │
                    │                        │  │  build_from_proj.   │  │
                    │                        │  │  build_from_har     │  │
                    │                        │  │  build_from_openapi │  │
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
        │  │  • clientCredentialsToken() - Headless machine-to-machine│  │
        │  │  • getAccessToken() - Get valid token (auto-refresh)     │  │
        │  └──────────────────────────────────────────────────────────┘  │
        │                                                                │
        │  ┌──────────────────────────────────────────────────────────┐  │
        │  │          Session Manager (session-manager.ts)            │  │
        │  │  • loadSessions() - Load from ~/.ifs-mcp/session.json    │  │
        │  │  • saveSession() / removeSession() - Persist or delete   │  │
        │  │  • getCurrentSessionId() - Active environment's key      │  │
        │  │    (delegates to getActiveSessionKey() in config.ts)       │  │
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
Application bootstrap: loads env vars, initializes OAuthManager, restores saved sessions, starts the MCP (stdio) server. The Express OAuth callback server is **not** started here — it only starts on-demand when `start_oauth` is called.

### 2. MCP Server (`src/server/mcp-server.ts`)
MCP protocol handler. Registers tool, resource, and prompt definitions. Routes tool calls to handlers, serves resource content on read requests, and executes prompt handlers that return structured conversation messages.

### 3. OAuth Callback Server (`src/server/oauth-callback-server.ts`)
Express server on `http://localhost:3000`. Started **on-demand** by the `start_oauth` tool (not at process boot) — not running at any other time. Handles `/oauth/callback` redirects, exchanges auth codes for tokens, saves sessions to disk. Never used at all for `client_credentials` environments, which authenticate without a browser.

### 4. API Client (`src/lib/api-client.ts`)
Authenticated HTTP client. Resolves the base URL per-environment via `getApiBaseUrlForKey()` (falls back to the legacy flat `API_BASE_URL` env var), attaches Bearer token, used by all tools.

### 5. Authentication Layer

**OAuth Manager** (`src/lib/auth/oauth-manager.ts`) - OAuth 2.0 + PKCE flow orchestration for `authorization_code` environments, plus `clientCredentialsToken()` for machine-to-machine auth on `client_credentials` environments. Automatic token refresh/re-fetch with a 5-minute expiry buffer either way.

**Session Manager** (`src/lib/auth/session-manager.ts`) - Persists sessions to `~/.ifs-mcp/session.json`, keyed per environment; restores on startup.

**Token Store** (`src/lib/auth/token-store.ts`) - In-memory `Map<sessionId, TokenData>`.

### 6. Configuration (`src/lib/types.ts`, `src/lib/config.ts`)
Two resolution paths, checked in this order:
1. **Environment variables** (legacy, always wins if set): `API_BASE_URL`, `OAUTH_REALM`, `OAUTH_CLIENT_ID`, `SKILLS_DIR` — the only mechanism Claude Desktop's `user_config` settings UI populates.
2. **Environment registry** (`src/lib/config.ts`, persisted to `~/.ifs-mcp/config.json`): named environments, each with its own `apiBaseUrl`/`oauthRealm`/`oauthClientId`, optional `authMode` (`authorization_code` default, or `client_credentials`), `clientSecret`, and `readOnly` flag. This is the only configuration path available to Claude Code (no settings UI), and works equally under Desktop. See [Managing IFS Environments](../getting-started/ENVIRONMENTS.md).

Session/token keys are the active environment's name (or `"default"` in legacy env-var mode) rather than an opaque generated ID — `getActiveSessionKey()` in `config.ts` resolves this, so tokens are always paired with the environment they were issued for.

### 7. Tools

| Tool | Category | Description |
|------|----------|-------------|
| `add_ifs_environment` | Environment | Register (or update) a named IFS environment, auth mode, and optional read-only flag |
| `list_ifs_environments` | Environment | List registered environments, which is active, and auth status |
| `use_ifs_environment` | Environment | Switch which environment subsequent calls target |
| `remove_ifs_environment` | Environment | Delete an environment and its saved session |
| `start_oauth` | Auth | Initiate OAuth flow (browser for `authorization_code`; silent token fetch for `client_credentials`) |
| `get_session_info` | Auth | Check session status for the active environment |
| `call_protected_api` | API | Generic authenticated API calls; accepts an optional `environment` override |
| `get_api_guide` | API | Retrieve API guide for a specific IFS projection |
| `export_api_data` | API | Export large result sets to CSV with automatic pagination |
| `import_skill` | Skills | Import a skill `.md` from a URL or local file path |
| `save_skill` | Skills | Save or update a skill `.md`; returns a change diff for updates |
| `parse_har_file` | Skill authoring | Parse a browser HAR file; returns structured summary of IFS API operations |
| `read_openapi_file` | Skill authoring | Parse a downloaded OpenAPI/Swagger JSON file; returns entity sets and field schemas |

### 8. Prompts

MCP prompts are guided conversation starters. In Claude Desktop they appear in the `+` menu; in Claude Code the same three are also exposed as slash commands (`/build-skill-from-projection`, `/build-skill-from-har`, `/build-skill-from-openapi`). They accept arguments and return structured messages that set up a specific workflow.

| Prompt | Arguments | Description |
|--------|-----------|-------------|
| `build_ifs_skill_from_projection` | `projection_name`, `skill_name` | Fetch the OpenAPI spec live from IFS and build a skill |
| `build_ifs_skill_from_har` | `har_file_path`, `skill_name` | Build a skill from a browser HAR recording |
| `build_ifs_skill_from_openapi` | `openapi_file_path`, `skill_name` | Build a skill from a downloaded OpenAPI/Swagger JSON file |

Each prompt accepts `skill_name` (the output filename without `.md`) alongside its primary input. All three paths call `get_api_guide("ifs-skill-authoring")` to load format instructions, then invoke their respective parser tool (`parse_har_file` / `read_openapi_file` / live API fetch), and converge into the same guided Q&A and `save_skill` completion flow.

### 9. Resources

MCP resources provide API guides as markdown that Claude reads to learn how to construct `call_protected_api` calls for specific IFS projections.

| Resource | URI | Description |
|----------|-----|-------------|
| IFS OData Reference | `ifs://ifs-common-odata-reference/guide` | OData query syntax reference for IFS Cloud projections |
| IFS Customer Management | `ifs://ifs-sales-customers/guide` | Example skill: create/query customers |
| IFS Skill Authoring Guide | `ifs://ifs-skill-authoring/guide` | Format reference the `build_ifs_skill_*` prompts load via `get_api_guide("ifs-skill-authoring")` |

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
LLM ──tool call──> MCP Server ──get active environment's session──> Session Manager
  ──get token──> Token Store ──expired?──> authorization_code: refresh with OAuth Provider
                              ──expired?──> client_credentials: re-fetch (no refresh token issued)
  ──valid token──> axios ──Bearer auth──> IFS Cloud API ──response──> LLM
```

### Skill Authoring (Capture → Refine → Make → Use)
```
HAR path (build_ifs_skill_from_har):
1. CAPTURE
   User works in IFS Cloud browser UI
   DevTools Network tab ──export──> .har file

2. REFINE
   User invokes build_ifs_skill_from_har(har_file_path=..., skill_name=...)
   Claude calls parse_har_file tool ──parseHar()──> filtered operation groups
   Claude presents summary ──asks clarifying questions──> User answers

OpenAPI path - local file (build_ifs_skill_from_openapi):
1. DOWNLOAD
   User fetches {server}/.svc/$openapi?V2 from browser, saves as JSON

2. REFINE
   User invokes build_ifs_skill_from_openapi(openapi_file_path=..., skill_name=...)
   Claude calls read_openapi_file tool ──parseOpenApi()──> entity sets + field schemas
   Claude presents summary ──asks clarifying questions──> User answers

OpenAPI path - live fetch (build_ifs_skill_from_projection):
1. REFINE (directly)
   User invokes build_ifs_skill_from_projection(projection_name=CustomerHandling, skill_name=...)
   Claude calls call_protected_api ──$openapi?V2──> spec JSON
   Claude extracts entity sets, fields ──asks clarifying questions──> User answers

All paths converge:
3. MAKE
   Claude drafts .md guide ──calls save_skill(filename=skill_name, content=...)──>
   save_skill writes to SKILLS_DIR/ (if set) or build/resources/
   (update path: reads old file ──diff──> returns change summary)

4. USE
   Next get_api_guide call ──getResources() scans dir──> skill available immediately
   No restart needed
   Share: copy .md URL ──recipient runs──> import_skill({ source: url })
```

## Design Decisions

1. **Dual Server Architecture** - Express for browser OAuth callbacks (started on-demand, not at boot) + MCP stdio for the client, whichever it is. Both in one process when the callback server is running.
2. **Session Persistence** - Sessions survive restarts via `~/.ifs-mcp/session.json`, keyed per environment. LLM doesn't need to track session IDs. Refreshed tokens are also persisted so sessions continue seamlessly after restarts.
3. **Automatic Token Refresh** - Transparent to LLM. 5-minute expiry buffer in `getAccessToken()`.
4. **Modular Tool Design** - Each tool exports `definition` + `handler`. Registered in `tools/index.ts`.
5. **Resource-Driven API Knowledge** - Instead of hardcoding tools per endpoint, API guides (markdown) teach the LLM how to use `call_protected_api`. Users can add new guides without code changes.
6. **Three Skill Authoring Paths** - HAR-based authoring captures real browser traffic (what users actually do). OpenAPI-based authoring uses the projection's `$openapi?V2` spec (full CRUD surface with typed field schemas) — either live-fetched or from a local file. HAR is better for transactional workflows; OpenAPI is better for master data. All three paths converge into the same guided Q&A and `save_skill` flow. `skill_name` is provided upfront so Claude saves with the correct filename without asking.
7. **Portable Skills** - Skill files are plain markdown. Export = share the file. Import = `import_skill` tool. No registry or special format needed.
8. **Security** - Default (`authorization_code`) mode uses a public OAuth client with PKCE — no client secret involved. `client_credentials` mode is the exception: it requires a confidential client and stores its secret in `~/.ifs-mcp/config.json` (see [Security](../../SECURITY.md#if-you-use-client_credentials-environments)). Plus: CSRF state parameter, HTTPS-only remote skill imports, path traversal protection on skill writes, tokens stored locally.
9. **Host-Agnostic Core** - Nothing under `src/` reads `manifest.json` or `.claude-plugin/`. Each host's config only declares how to launch the same `build/index.js` and, for Desktop, which env vars to inject — the server itself never knows or cares which host started it. Codex CLI needs no packaging at all — a direct `codex mcp add` / `config.toml` entry works unmodified, since MCP is a protocol, not a client-specific integration.

## File Structure
```
src/
├── index.ts                          # Entry point
├── lib/
│   ├── types.ts                      # Config resolution (env vars, falls back to config.ts)
│   ├── config.ts                     # Environment registry (~/.ifs-mcp/config.json)
│   ├── api-client.ts                 # Authenticated HTTP client
│   ├── har-parser.ts                 # HAR file parsing (parseHar, summariseHar)
│   ├── openapi-parser.ts             # OpenAPI/Swagger parsing (parseOpenApi, summariseOpenApi)
│   └── auth/
│       ├── oauth-manager.ts          # OAuth flow logic (authorization_code + client_credentials)
│       ├── session-manager.ts        # Session persistence, keyed per environment
│       └── token-store.ts            # In-memory storage
├── prompts/
│   ├── index.ts                      # Prompt registry
│   └── build-ifs-skill-guide.ts      # 3 skill-building prompts (projection / HAR / OpenAPI)
├── resources/
│   ├── index.ts                      # Resource registry (auto-discovery)
│   ├── ifs-common-odata-reference.md # Bundled OData syntax reference
│   ├── ifs-sales-customers.md        # Bundled example skill (Customer Management)
│   └── ifs-skill-authoring.md        # Skill-format guide, loaded by the build_ifs_skill_* prompts
├── server/
│   ├── mcp-server.ts                 # MCP protocol handler
│   └── oauth-callback-server.ts      # Express OAuth callback (started on-demand)
└── tools/
    ├── index.ts                      # Tool registry
    ├── env/
    │   ├── add-ifs-environment.ts    # Register/update a named environment
    │   ├── list-ifs-environments.ts  # List environments, active + auth status
    │   ├── use-ifs-environment.ts    # Switch the active environment
    │   └── remove-ifs-environment.ts # Delete an environment + its session
    ├── auth/
    │   ├── start-oauth.ts            # Start OAuth flow
    │   └── get-session-info.ts       # Check session status
    └── api/
        ├── call-protected-api.ts     # Generic API calls
        ├── get-api-guide.ts          # Retrieve API guides from resources
        ├── export-api-data.ts        # Paginated CSV export
        ├── import-skill.ts           # Import skill from URL or file
        ├── save-skill.ts             # Save/update skill with change diff
        ├── parse-har-file.ts         # Parse browser HAR file for skill authoring
        └── read-openapi-file.ts      # Parse OpenAPI/Swagger JSON for skill authoring
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
