# IFS MCP Server - Tools & Resources

## Tools

### 1. start_oauth
Initiate OAuth 2.0 login flow. Opens a browser window for IFS Cloud authentication.

```
start_oauth()
start_oauth({ force: true })  // Force re-authentication
```

### 2. get_session_info
Check current authentication status, session expiry, and refresh capability.

```
get_session_info()
```

### 3. call_protected_api
Make authenticated API calls to any IFS Cloud endpoint. This is the core tool — use it with the resource guides below.

```
call_protected_api({ endpoint: "/main/ifsapplications/...", method: "GET" })
call_protected_api({ endpoint: "/main/ifsapplications/...", method: "POST", body: {...} })
```

**Inputs:** `endpoint` (required), `method` (required), `body`, `sessionId`
**Methods:** GET, POST, PUT, DELETE, PATCH

### 4. get_api_guide
Retrieve an API guide for a specific IFS projection. Call this before using `call_protected_api` to learn the correct endpoints and OData syntax.

```
get_api_guide()                          // List available guides
get_api_guide({ guide: "quick-reports" }) // Get the Quick Reports guide
```

**Inputs:** `guide` (optional — lists available guides if omitted)

### 5. export_api_data
Export large API result sets to a CSV file. Fetches data in batches of 100 records using `$top`/`$skip` pagination and saves to `~/.ifs-mcp/exports/`.

```
export_api_data({ endpoint: "/main/ifsapplications/...", method: "GET" })
export_api_data({ endpoint: "/main/ifsapplications/...", method: "GET", filename: "sales-reports" })
```

**Inputs:** `endpoint` (required), `method` (required), `filename` (optional), `sessionId`, `body`

## Resources

Resources are API guides that Claude reads to learn how to construct `call_protected_api` calls for specific IFS projections.

| Resource | URI | Description |
|----------|-----|-------------|
| IFS Quick Reports | `ifs://quick-reports/guide` | Search, list, get parameters, execute Quick Reports |

### Adding New Resources

1. Create a markdown file in `src/resources/` describing the API endpoints
   - Start with a `# Heading` (becomes the resource name)
   - First paragraph becomes the description
2. Rebuild with `npm run build`

Resources are auto-discovered from `.md` files — no code changes needed.

## Authentication

- Authenticate once via `start_oauth`
- Sessions are saved to `~/.ifs-mcp/session.json` and persist across restarts
- Tokens are auto-refreshed when nearing expiry (5-minute buffer)
- Optional `sessionId` parameter available for multi-session scenarios
