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

### 7. parse_har_file
Parse a browser HAR file and return a structured summary of IFS API operations found. Used internally by `build_ifs_skill_from_har` but can also be called directly to inspect a recording.

```
parse_har_file({ path: "C:\\Users\\YourName\\Downloads\\recording.har" })
```

**Inputs:** `path` (required — absolute path to `.har` file)

### 8. read_openapi_file
Parse a downloaded OpenAPI/Swagger JSON spec and return a structured summary of entity sets, operations, and fields. Used internally by `build_ifs_skill_from_openapi` but can also be called directly to inspect a spec.

```
read_openapi_file({ path: "C:\\Users\\YourName\\Downloads\\CustomerHandling.json" })
```

**Inputs:** `path` (required — absolute path to OpenAPI/Swagger JSON file)

### 9. save_skill
Save or update a skill guide file in the skills library. Writes to `SKILLS_DIR` if set, otherwise `build/resources/`. Used internally by the skill-building prompts but can also be called directly. For updates, returns a structured diff showing what changed (sections, fields, examples added or removed). The skill is available immediately — no restart needed.

```
save_skill({ filename: "ifs-purchase-orders.md", content: "# Purchase Orders\n..." })
```

**Inputs:** `filename` (required — must end in `.md`), `content` (required — full markdown content)

## Prompts

Prompts are guided workflows available in Claude Desktop's `+` menu. They set up a structured conversation with instructions and context already loaded.

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

### Adding New Resources

The recommended way is via one of the skill-building prompts above. To add one manually:

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
