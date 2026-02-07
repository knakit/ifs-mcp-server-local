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

## Resources

Resources are API guides that Claude reads to learn how to construct `call_protected_api` calls for specific IFS projections.

| Resource | URI | Description |
|----------|-----|-------------|
| IFS Quick Reports | `ifs://quick-reports/guide` | Search, list, get parameters, execute Quick Reports |

### Adding New Resources

1. Create a markdown file in `src/resources/` describing the API endpoints
2. Register it in `src/resources/index.ts` with a `ifs://` URI
3. Rebuild with `npm run build`

## Authentication

- Authenticate once via `start_oauth`
- Sessions are saved to `~/.ifs-mcp/session.json` and persist across restarts
- Tokens are auto-refreshed when nearing expiry (5-minute buffer)
- Optional `sessionId` parameter available for multi-session scenarios
