# IFS MCP Server - Tools & Resources

## Tools

### Environment management

See [Managing IFS Environments](../getting-started/ENVIRONMENTS.md) for the full guide — summary reference below.

#### add_ifs_environment
Register (or update) a named IFS Cloud environment. The first one added becomes active automatically.

```
add_ifs_environment({ name: "prod", apiBaseUrl: "https://your-tenant.ifs.cloud", oauthRealm: "yourrealm", oauthClientId: "..." })
add_ifs_environment({ name: "automation", apiBaseUrl: "...", oauthRealm: "...", oauthClientId: "...", authMode: "client_credentials", clientSecret: "...", readOnly: true })
```

**Inputs:** `name`, `apiBaseUrl`, `oauthRealm`, `oauthClientId` (all required); `authMode` (`authorization_code` default, or `client_credentials`); `clientSecret` (required with `client_credentials`); `readOnly` (optional)

#### list_ifs_environments
List all registered environments, which is active, and whether each is currently authenticated. Also returns `diagnostics` (the resolved `homeDir`/`configFile` this process is actually reading) — useful when a host launches the server in an unexpected context and it can't see environments you know you registered.

```
list_ifs_environments()
```

#### use_ifs_environment
Switch which environment subsequent calls target.

```
use_ifs_environment({ name: "test" })
```

**Inputs:** `name` (required — must already be registered)

#### remove_ifs_environment
Delete an environment and its saved session/token together.

```
remove_ifs_environment({ name: "test" })
```

**Inputs:** `name` (required)

### Authentication and API tools

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
Make authenticated API calls to any IFS Cloud endpoint. This is the core tool — use it with the resource guides below. Targets the active environment unless `environment` overrides it for this one call. If an environment is marked `readOnly`, non-`GET` methods are blocked.

```
call_protected_api({ endpoint: "/main/ifsapplications/...", method: "GET" })
call_protected_api({ endpoint: "/main/ifsapplications/...", method: "POST", body: {...} })
call_protected_api({ environment: "test", endpoint: "/main/ifsapplications/...", method: "GET" })
call_protected_api({ endpoint: "/main/.../CompanySet(Company='10')", method: "PATCH", body: {...}, headers: { "If-Match": "W/\"...\"" } })
call_protected_api({ endpoint: "/main/.../DocumentUpload", method: "POST", body: {...}, headers: { "X-IFS-Content-Disposition": "attachment; filename=report.pdf" } })
```

**Inputs:** `endpoint` (required), `method` (required), `body`, `sessionId`, `environment` (optional — one-off override of the active environment), `headers` (optional — only `If-Match`/`If-None-Match` (OData optimistic concurrency) and `X-IFS-Content-Disposition` (IFS's custom filename header) are allowed; any other header is rejected with `disallowed_headers`)
**Methods:** GET, POST, PUT, DELETE, PATCH

### 4. get_api_guide
Retrieve an API guide for a specific IFS projection. Call this before using `call_protected_api` to learn the correct endpoints and OData syntax.

```
get_api_guide()                                        // List available guides
get_api_guide({ guide: "ifs-common-odata-reference" }) // Get the OData reference
get_api_guide({ guide: "ifs-sales-customers" })        // Get the Customer Management guide
```

**Inputs:** `guide` (optional — lists available guides if omitted)

### 5. export_api_data
Export large API result sets to a CSV file. Fetches data in batches of 100 records using `$top`/`$skip` pagination and saves to `~/Downloads/` (or `~/.ifs-mcp/exports/` if that doesn't exist). Keyed/singleton endpoints (e.g. `CompanySet(Company='10')`) are detected automatically and exported as a single row, with no pagination applied — IFS rejects `$skip` on those outright.

```
export_api_data({ endpoint: "/main/ifsapplications/...", method: "GET" })
export_api_data({ endpoint: "/main/ifsapplications/...", method: "GET", filename: "sales-reports" })
export_api_data({ environment: "test", endpoint: "/main/ifsapplications/...", method: "GET" })
export_api_data({ endpoint: "/main/.../CompanySet(Company='10')", method: "GET" })  // singleton, no pagination
```

**Inputs:** `endpoint` (required), `method` (required), `filename` (optional), `sessionId`, `body`, `environment` (optional), `headers` (optional — same allowlist as `call_protected_api`)

### 6. import_skill
Import a skill guide from a URL or local file path. Supports GitHub raw URLs, Gist URLs, or any direct `.md` link. Saves to `SKILLS_DIR` if set, otherwise `build/resources/`. The skill is available immediately — no restart needed.

```
import_skill({ source: "https://raw.githubusercontent.com/user/repo/main/skills/my-skill.md" })
import_skill({ source: "/path/to/my-skill.md" })
import_skill({ source: "https://...", filename: "ifs-purchase-orders.md" })
```

**Inputs:** `source` (required — URL or file path), `filename` (optional — defaults to last segment of source)

### 7. save_skill
Save or update a skill guide file in the skills library. Writes to `SKILLS_DIR` if set, otherwise `build/resources/`. Used internally by the skill-building prompts but can also be called directly. For updates, returns a structured diff showing what changed (sections, fields, examples added or removed). The skill is available immediately — no restart needed.

```
save_skill({ filename: "ifs-purchase-orders.md", content: "# Purchase Orders\n..." })
```

**Inputs:** `filename` (required — must end in `.md`), `content` (required — full markdown content)

### 8. parse_har_file
Parse a browser HAR file and return a structured summary of IFS API operations found. Used internally by `build_ifs_skill_from_har` but can also be called directly to inspect a recording.

```
parse_har_file({ path: "C:\\Users\\YourName\\Downloads\\recording.har" })
```

**Inputs:** `path` (required — absolute path to `.har` file)

### 9. read_openapi_file
Parse a downloaded OpenAPI/Swagger JSON spec and return a structured summary of entity sets, operations, and fields. Used internally by `build_ifs_skill_from_openapi` but can also be called directly to inspect a spec.

```
read_openapi_file({ path: "C:\\Users\\YourName\\Downloads\\CustomerHandling.json" })
```

**Inputs:** `path` (required — absolute path to OpenAPI/Swagger JSON file)

## Prompts

Prompts are guided workflows that set up a structured conversation with instructions and context already loaded. In Claude Desktop they're available from the `+` menu; in Claude Code the same three are also exposed as slash commands (`/build-skill-from-projection`, `/build-skill-from-har`, `/build-skill-from-openapi`). Codex CLI has no prompt surface for MCP-declared prompts — call `get_api_guide`, `parse_har_file`, or `read_openapi_file` directly instead and drive the same Capture → Refine → Make → Use flow manually.

### build_ifs_skill_from_projection
Build a new IFS skill by fetching the OpenAPI spec live from IFS. Best for master data projections (customers, suppliers, parts). Requires an active authenticated session.

**Arguments:**
- `projection_name` (required) — projection service name, e.g. `CustomerHandling`, `PartHandling`
- `skill_name` (required) — filename for the skill without `.md`, e.g. `ifs-sales-customers`

**Workflow:**
1. **Fetch** — Claude calls `call_protected_api` to fetch the spec from `/$openapi?V2`
2. **Refine** — Claude extracts entity sets, operations, and field schemas, then asks which operations you need and what field names mean
3. **Make** — Claude drafts the guide and saves it as `{skill_name}.md` via `save_skill`
4. **Use** — Available immediately via `get_api_guide`

---

### build_ifs_skill_from_har
Build a new IFS skill from browser traffic. Best for transactional workflows (orders, approvals, multi-step processes).

**Arguments:**
- `har_file_path` (required) — absolute path to a `.har` file exported from browser DevTools
- `skill_name` (required) — filename for the skill without `.md`, e.g. `ifs-purchase-orders`

**Workflow:**
1. **Capture** — Use IFS Cloud in your browser. In DevTools (F12), go to Network tab, right-click → *Save all as HAR with content*
2. **Refine** — Claude calls `parse_har_file` to summarise operations found, then asks what each means in your workflow
3. **Make** — Claude drafts the guide and saves it as `{skill_name}.md` via `save_skill`. Change summary shown automatically when updating
4. **Use** — Available immediately via `get_api_guide`

---

### build_ifs_skill_from_openapi
Build a new IFS skill from a downloaded OpenAPI/Swagger spec file. Use when you prefer to inspect the spec offline first.

**Arguments:**
- `openapi_file_path` (required) — absolute path to a downloaded Swagger/OpenAPI JSON file
- `skill_name` (required) — filename for the skill without `.md`, e.g. `ifs-parts`

**Workflow:**
1. **Download** — Fetch the spec from `{server}/main/ifsapplications/projection/v1/{ServiceName}.svc/$openapi?V2`, save as `.json`
2. **Refine** — Claude calls `read_openapi_file` to extract entity sets and field schemas, then asks clarifying questions
3. **Make** — Claude drafts the guide and saves it as `{skill_name}.md` via `save_skill`
4. **Use** — Available immediately via `get_api_guide`

## Resources

Resources are API guides that Claude reads to learn how to construct `call_protected_api` calls for specific IFS projections.

| Resource | URI | Description |
|----------|-----|-------------|
| IFS OData Reference | `ifs://ifs-common-odata-reference/guide` | OData query syntax reference for IFS Cloud projections |
| IFS Customer Management | `ifs://ifs-sales-customers/guide` | Example skill: create/query customers |
| IFS Skill Authoring Guide | `ifs://ifs-skill-authoring/guide` | Format reference used internally by the skill-building prompts (also loaded via `get_api_guide("ifs-skill-authoring")`) |

### Adding New Resources

The recommended way is via one of the skill-building prompts above. To add one manually:

1. Create a markdown file in `SKILLS_DIR` (if set) or `build/resources/` (e.g., `ifs-purchase-orders.md`)
   - Start with `# Heading` (becomes the resource name)
   - First paragraph becomes the description
   - Filename becomes the URI slug → `ifs://purchase-orders/guide`
2. If adding directly to `src/resources/` instead, rebuild with `npm run build` (bare `tsc` skips the step that copies `.md` files into `build/resources/`)

The skill is available immediately on the next request — no restart needed. To remove a skill: delete the `.md` file. It disappears from the next request onwards.

### Sharing Skills

Skills are plain `.md` files. The [ifs-mcp-skills](https://github.com/knakit/ifs-mcp-skills) repository is the community home for shared IFS skills — browse for ready-made skills or contribute your own.

Import any skill directly:
```
import_skill({ source: "https://raw.githubusercontent.com/knakit/ifs-mcp-skills/main/ifs-sales-customers.md" })
```

## Authentication

- Register at least one environment first (see [Managing IFS Environments](../getting-started/ENVIRONMENTS.md)), or set the legacy `API_BASE_URL`/`OAUTH_REALM`/`OAUTH_CLIENT_ID` env vars
- Authenticate via `start_oauth` — opens a browser for `authorization_code` environments; for `client_credentials` environments it fetches a token silently, no browser involved
- Sessions are saved to `~/.ifs-mcp/session.json`, keyed per environment, and persist across restarts
- Tokens are auto-refreshed (or, for `client_credentials`, re-fetched) when nearing expiry — the margin scales to the token's own lifetime (10%, floored at 5s, capped at 30s) rather than a fixed buffer, so short-lived tokens (some IFS environments issue client_credentials tokens under 5 minutes) don't get re-fetched before every single call
- Optional `sessionId`/`environment` parameters available to target a non-active environment for a single call
