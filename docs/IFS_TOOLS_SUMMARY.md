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
get_api_guide()                                        // List available guides
get_api_guide({ guide: "ifs-common-odata-reference" }) // Get the OData reference
get_api_guide({ guide: "ifs-sales-customers" })        // Get the Customer Management guide
```

**Inputs:** `guide` (optional — lists available guides if omitted)

### 5. export_api_data
Export large API result sets to a CSV file. Fetches data in batches of 100 records using `$top`/`$skip` pagination and saves to `~/.ifs-mcp/exports/`.

```
export_api_data({ endpoint: "/main/ifsapplications/...", method: "GET" })
export_api_data({ endpoint: "/main/ifsapplications/...", method: "GET", filename: "sales-reports" })
```

**Inputs:** `endpoint` (required), `method` (required), `filename` (optional), `sessionId`, `body`

### 6. import_skill
Import a skill guide from a URL or local file path. Supports GitHub raw URLs, Gist URLs, or any direct `.md` link. Saves to `SKILLS_DIR` if set, otherwise `build/resources/`. The skill is available immediately — no restart needed.

```
import_skill({ source: "https://raw.githubusercontent.com/user/repo/main/skills/my-skill.md" })
import_skill({ source: "/path/to/my-skill.md" })
import_skill({ source: "https://...", filename: "ifs-purchase-orders.md" })
```

**Inputs:** `source` (required — URL or file path), `filename` (optional — defaults to last segment of source)

### 7. save_skill
Save or update a skill guide file in the skills library. Writes to `SKILLS_DIR` if set, otherwise `build/resources/`. Used internally by `build_ifs_skill_guide` but can also be called directly. For updates, returns a structured diff showing what changed (sections, fields, examples added or removed). The skill is available immediately — no restart needed.

```
save_skill({ filename: "ifs-purchase-orders.md", content: "# Purchase Orders\n..." })
```

**Inputs:** `filename` (required — must end in `.md`), `content` (required — full markdown content)

## Prompts

Prompts are guided workflows available in Claude Desktop's `+` menu. They set up a structured conversation with instructions and context already loaded.

### build_ifs_skill_guide
Build a new IFS skill from browser traffic, a downloaded OpenAPI spec, or by fetching the spec live from IFS. Walks through a guided conversation to capture business context before drafting the guide. Provide exactly one of the three arguments below.

**Arguments (provide exactly one):**
- `har_file_path` — absolute path to a `.har` file exported from browser DevTools (best for transactional workflows)
- `openapi_file_path` — absolute path to a downloaded Swagger/OpenAPI JSON file (best for master data)
- `projection_name` — projection service name to fetch the OpenAPI spec live (e.g. `CustomerHandling`); requires an active authenticated session

**HAR workflow:**

1. **Capture** — Use IFS Cloud in your browser. In DevTools (F12), go to Network tab, right-click → *Save all as HAR with content*.
2. **Refine** — Open `build_ifs_skill_guide` with `har_file_path`. Claude summarises operations found and asks what each means in your workflow.
3. **Make** — Claude drafts the guide, asks for a filename, and saves it via `save_skill`. Change summary shown automatically when updating.
4. **Use** — The skill is available immediately via `get_api_guide` — no restart needed.

**OpenAPI workflow (live fetch):**

1. **Fetch** — Open `build_ifs_skill_guide` with `projection_name=CustomerHandling`. Claude calls `call_protected_api` to fetch the spec from `/$openapi?V2`.
2. **Refine** — Claude extracts entity sets, operations, and field schemas, then asks which operations you need and what field names mean.
3. **Make** — Claude drafts the guide, asks for a filename, and saves it via `save_skill`.
4. **Use** — Available immediately.

**OpenAPI workflow (local file):**

Same as live fetch, but provide `openapi_file_path` instead. Download the spec from `{server}/main/ifsapplications/projection/v1/{ServiceName}.svc/$openapi?V2` first.

## Resources

Resources are API guides that Claude reads to learn how to construct `call_protected_api` calls for specific IFS projections.

| Resource | URI | Description |
|----------|-----|-------------|
| IFS OData Reference | `ifs://ifs-common-odata-reference/guide` | OData query syntax reference for IFS Cloud projections |

### Adding New Resources

The recommended way is via the `build_ifs_skill_guide` prompt (see above). To add one manually:

1. Create a markdown file in `SKILLS_DIR` (if set) or `build/resources/` (e.g., `ifs-purchase-orders.md`)
   - Start with `# Heading` (becomes the resource name)
   - First paragraph becomes the description
   - Filename becomes the URI slug → `ifs://purchase-orders/guide`
2. If adding directly to `src/resources/` instead, rebuild first: `npx tsc`

The skill is available immediately on the next request — no restart needed. To remove a skill: delete the `.md` file. It disappears from the next request onwards.

### Sharing Skills

Skills are plain `.md` files. The [ifs-mcp-skills](https://github.com/knakit/ifs-mcp-skills) repository is the community home for shared IFS skills — browse for ready-made skills or contribute your own.

Import any skill directly:
```
import_skill({ source: "https://raw.githubusercontent.com/knakit/ifs-mcp-skills/main/ifs-sales-customers.md" })
```

## Authentication

- Authenticate once via `start_oauth`
- Sessions are saved to `~/.ifs-mcp/session.json` and persist across restarts
- Tokens are auto-refreshed when nearing expiry (5-minute buffer)
- Optional `sessionId` parameter available for multi-session scenarios
