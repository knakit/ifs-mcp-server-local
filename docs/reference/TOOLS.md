# MCP Server for IFS Cloud - Tools & Resources

## Tools

What a tool returns becomes part of the conversation, so it can reach your AI agent's model provider. The [FAQ](../FAQ.md#data-flow-and-privacy) lists what each tool returns and what stays local.

### Environment management

See [Managing IFS Environments](../getting-started/ENVIRONMENTS.md) for the full guide — summary reference below.

#### add_ifs_environment
Register (or update) a named IFS Cloud environment. The first one added becomes active automatically.

```
add_ifs_environment({ name: "prod", apiBaseUrl: "https://your-tenant.ifs.cloud", oauthRealm: "yourrealm", oauthClientId: "..." })
add_ifs_environment({ name: "automation", apiBaseUrl: "...", oauthRealm: "...", oauthClientId: "...", authMode: "client_credentials", readOnly: true })
```

**Inputs:** `name`, `apiBaseUrl`, `oauthRealm`, `oauthClientId` (all required); `authMode` (`authorization_code` default, or `client_credentials`); `readOnly` (optional — when you update an existing environment, omitting it keeps the current setting; pass `false` to turn it off)

**No client secret:** this tool takes no secret and refuses one if passed. For `client_credentials`, the response says where to add it yourself: the `IFS_CLIENT_SECRET_<NAME>` environment variable, or a `clientSecret` entry in `~/.ifs-mcp/config.json`. See [Managing IFS Environments](../getting-started/ENVIRONMENTS.md#supplying-the-client-secret-client_credentials-only).

#### list_ifs_environments
List all registered environments, which is active, and whether each is currently authenticated. For `client_credentials` environments it also shows where the client secret comes from (`env`, `config` or `missing`), never its value. Also returns `diagnostics` (the resolved `homeDir`/`configFile` this process is actually reading) — useful when a host launches the server in an unexpected context and it can't see environments you know you registered.

```
list_ifs_environments()
```

#### use_ifs_environment
Switch which environment subsequent calls target. The response says whether you still need to log in and, for a `client_credentials` environment with no secret yet, how to add one.

```
use_ifs_environment({ name: "test" })
```

**Inputs:** `name` (required — must already be registered)

#### remove_ifs_environment
Delete an environment and its saved session/token together. If the removed environment was active and exactly one other remains, that one becomes active; otherwise no environment is active.

```
remove_ifs_environment({ name: "test" })
```

**Inputs:** `name` (required)

### Authentication and API tools

### 1. start_oauth
Authenticate to the active environment. For `authorization_code` environments it opens a browser login window (a callback server listens on `127.0.0.1:3000` only while you log in). For `client_credentials` environments it fetches a token silently, with no browser. If a session is already active it says so and does nothing unless `force: true`.

```
start_oauth()
start_oauth({ force: true })  // Force re-authentication
```

### 2. get_session_info
Check authentication status for the active environment: whether you are logged in, which environment is active, the session ID (which is the environment name), time to expiry, and whether the session can be refreshed. Tokens are never returned.

```
get_session_info()
```

### 3. call_protected_api
Make authenticated API calls to any IFS Cloud endpoint. This is the core tool — use it with the resource guides below. Targets the active environment unless `environment` overrides it for this one call. If an environment is marked `readOnly`, non-`GET` methods are blocked. The `endpoint` must be a path that starts with a single `/`; full URLs, `//host` and `@host` forms are rejected so a request can never be sent to a different host than your IFS Cloud instance.

```
call_protected_api({ endpoint: "/main/ifsapplications/...", method: "GET" })
call_protected_api({ endpoint: "/main/ifsapplications/...", method: "POST", body: {...} })
call_protected_api({ environment: "test", endpoint: "/main/ifsapplications/...", method: "GET" })
call_protected_api({ endpoint: "/main/.../CompanySet(Company='10')", method: "PATCH", body: {...}, headers: { "If-Match": "W/\"...\"" } })
call_protected_api({ endpoint: "/main/.../DocumentUpload", method: "POST", body: {...}, headers: { "X-IFS-Content-Disposition": "attachment; filename=report.pdf" } })
```

**Inputs:** `endpoint` (required), `method` (required), `body`, `sessionId`, `environment` (optional — one-off override of the active environment), `headers` (optional — only `If-Match`/`If-None-Match` (OData optimistic concurrency) and `X-IFS-Content-Disposition` (IFS's custom filename header) are allowed; any other header is rejected with `disallowed_headers`)
**Methods:** GET, POST, PUT, DELETE, PATCH

**Large responses:** if the formatted JSON response is over 100 KB, the tool returns a summary instead: the record count, the field names and **one complete sample record**, with options to preview, narrow with `$select`, or export to CSV.

**Errors you may see:** `no_environment_configured`, `no_environment_selected` (several environments exist and none is active, so the tool will not guess), `unknown_environment`, `read_only_environment`, `invalid_endpoint`, `disallowed_headers`, and `authentication_required` (the agent is told to call `start_oauth`).

### 4. get_api_guide
Find and return a skill (API guide). Call this before `call_protected_api` to learn the correct endpoints and OData syntax. The `guide` value is matched, case-insensitively, against each guide's name, URI and description: an exact guide name wins outright, otherwise guides are scored on how many of your keywords they contain and the best match is returned. If another guide scored nearly as well, a footer lists it so you can load that one too.

```
get_api_guide()                                        // List available guides
get_api_guide({ guide: "ifs-common-odata-reference" }) // Get the OData reference
get_api_guide({ guide: "ifs-framework-client-navigator" }) // Find the projection behind a screen
```

**Inputs:** `guide` (optional — one or more keywords, or an exact guide name; lists all guides if omitted)

**When nothing matches:** the tool returns an error that tells the agent not to guess endpoints. Instead it should look the screen up with the `ifs-framework-client-navigator` guide, show you the matching projection(s), and ask before building a new skill (always asking which one when there are several). See [Architecture](ARCHITECTURE.md), design decision 10.

### 5. export_api_data
Export large API result sets to a CSV file. Fetches data in batches of 100 records using `$top`/`$skip` pagination and saves to `~/Downloads/` (or `~/.ifs-mcp/exports/` if that doesn't exist). Keyed/singleton endpoints (e.g. `CompanySet(Company='10')`) are detected automatically and exported as a single row, with no pagination applied — IFS rejects `$skip` on those outright. It follows the same rules as `call_protected_api`: the endpoint must start with a single `/`, and non-`GET` methods are blocked on `readOnly` environments. The `filename` is reduced to letters, digits, `.`, `_` and `-`.

```
export_api_data({ endpoint: "/main/ifsapplications/...", method: "GET" })
export_api_data({ endpoint: "/main/ifsapplications/...", method: "GET", filename: "sales-reports" })
export_api_data({ environment: "test", endpoint: "/main/ifsapplications/...", method: "GET" })
export_api_data({ endpoint: "/main/.../CompanySet(Company='10')", method: "GET" })  // singleton, no pagination
```

**Inputs:** `endpoint` (required), `method` (required), `filename` (optional), `sessionId`, `body`, `environment` (optional), `headers` (optional — same allowlist as `call_protected_api`)

**Returns:** only the record count, the number of batches, the field names and the file path. The records themselves are written to the CSV and are not returned to the conversation.

### 6. import_skill
Import a skill guide from an HTTPS URL or an absolute local file path (GitHub raw URLs work well; plain `http://` is rejected). The file must start with a `# Heading`. It is saved to `SKILLS_DIR` if set, otherwise `build/resources/`, and is available immediately — no restart needed. An existing file with the same name is overwritten without a diff (`save_skill` shows a diff, `import_skill` does not).

```
import_skill({ source: "https://raw.githubusercontent.com/user/repo/main/skills/my-skill.md" })
import_skill({ source: "/path/to/my-skill.md" })
import_skill({ source: "https://...", filename: "ifs-purchase-orders.md" })
```

**Inputs:** `source` (required — HTTPS URL or absolute file path), `filename` (optional — must end in `.md`; defaults to the last segment of the source)

### 7. save_skill
Save or update a skill guide file in the skills library. Writes to `SKILLS_DIR` if set, otherwise `build/resources/`. Used internally by the skill-building prompts but can also be called directly. For updates, returns a structured diff showing what changed (sections, fields, examples added or removed). The skill is available immediately — no restart needed.

```
save_skill({ filename: "ifs-purchase-orders.md", content: "# Purchase Orders\n..." })
```

**Inputs:** `filename` (required — `.md` is added if missing; use the convention `ifs-[module]-[area]`), `content` (required — full markdown content)

**Returns:** `action` (`created` or `updated`), the skill title, the filename and path, and for updates a `changes` summary. Write the first line after the heading as a one-line summary of when to use the skill: `get_api_guide` matches on it.

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

Prompts are guided workflows that set up a structured conversation with instructions and context already loaded. In Claude Desktop they're available from the `+` menu; Claude Code lists the same three as slash commands (type `/` and look for the `build_ifs_skill_from_*` entries). Codex CLI has no prompt surface for MCP-declared prompts — call `get_api_guide`, `parse_har_file`, or `read_openapi_file` directly instead and drive the same Capture → Refine → Make → Use flow manually.

### build_ifs_skill_from_projection
Build a new IFS skill by fetching the OpenAPI spec live from IFS. Best for master data projections (customers, suppliers, parts). Requires an active authenticated session.

**Arguments:**
- `projection_name` (required) — projection service name, e.g. `CustomerHandling`, `PartHandling`
- `skill_name` (required) — filename for the skill without `.md`, e.g. `ifs-sales-customers`

**Workflow:**
1. **Fetch** — The agent calls `call_protected_api` to fetch the spec from `/$openapi?V2`
2. **Refine** — The agent extracts entity sets, operations, and field schemas, then asks which operations you need and what field names mean
3. **Make** — The agent drafts the guide and saves it as `{skill_name}.md` via `save_skill`
4. **Use** — Available immediately via `get_api_guide`

---

### build_ifs_skill_from_har
Build a new IFS skill from browser traffic. Best for transactional workflows (orders, approvals, multi-step processes).

**Arguments:**
- `har_file_path` (required) — absolute path to a `.har` file exported from browser DevTools
- `skill_name` (required) — filename for the skill without `.md`, e.g. `ifs-purchase-orders`

**Workflow:**
1. **Capture** — Use IFS Cloud in your browser. In DevTools (F12), go to Network tab, right-click → *Save all as HAR with content*
2. **Refine** — The agent calls `parse_har_file` to summarise operations found, then asks what each means in your workflow
3. **Make** — The agent drafts the guide and saves it as `{skill_name}.md` via `save_skill`. Change summary shown automatically when updating
4. **Use** — Available immediately via `get_api_guide`

---

### build_ifs_skill_from_openapi
Build a new IFS skill from a downloaded OpenAPI/Swagger spec file. Use when you prefer to inspect the spec offline first.

**Arguments:**
- `openapi_file_path` (required) — absolute path to a downloaded Swagger/OpenAPI JSON file
- `skill_name` (required) — filename for the skill without `.md`, e.g. `ifs-parts`

**Workflow:**
1. **Download** — Fetch the spec from `{server}/main/ifsapplications/projection/v1/{ServiceName}.svc/$openapi?V2`, save as `.json`
2. **Refine** — The agent calls `read_openapi_file` to extract entity sets and field schemas, then asks clarifying questions
3. **Make** — The agent drafts the guide and saves it as `{skill_name}.md` via `save_skill`
4. **Use** — Available immediately via `get_api_guide`

## Resources

Resources are API guides that your AI agent reads to learn how to construct `call_protected_api` calls for specific IFS projections.

| Resource | URI | Description |
|----------|-----|-------------|
| IFS OData Reference | `ifs://ifs-common-odata-reference/guide` | OData query syntax reference for IFS Cloud projections |
| IFS Framework Client Navigator | `ifs://ifs-framework-client-navigator/guide` | Finds the projection behind an IFS screen from its navigator label |
| IFS Framework Quick Reports | `ifs://ifs-framework-quick-reports/guide` | Searches, inspects and runs Quick Reports |
| IFS Skill Authoring Guide | `ifs://ifs-skill-authoring/guide` | Format reference used internally by the skill-building prompts (also loaded via `get_api_guide("ifs-skill-authoring")`) |

### Adding New Resources

The recommended way is via one of the skill-building prompts above. To add one manually:

1. Create a markdown file in `SKILLS_DIR` (if set) or `build/resources/` (e.g., `ifs-purchase-orders.md`)
   - Start with `# Heading` (becomes the resource name)
   - The first non-empty line after the heading becomes the description. Make it a one-line summary of when to use the guide, because `get_api_guide` matches on it
   - Filename becomes the URI slug → `ifs://purchase-orders/guide`
2. If adding directly to `src/resources/` instead, rebuild with `npm run build` (bare `tsc` skips the step that copies `.md` files into `build/resources/`)

The skill is available immediately on the next request — no restart needed. To remove a skill: delete the `.md` file. It disappears from the next request onwards.

### Sharing Skills

Skills are plain `.md` files. The [ifs-mcp-skills](https://github.com/knakit/ifs-mcp-skills) repository is the community home for shared IFS skills — browse for ready-made skills or contribute your own.

Import any skill directly:
```
import_skill({ source: "https://raw.githubusercontent.com/knakit/ifs-mcp-skills/main/skills/ifs-reporting-quick-reports.md" })
```

## Authentication

- Register at least one environment first (see [Managing IFS Environments](../getting-started/ENVIRONMENTS.md)), or set the legacy `API_BASE_URL`/`OAUTH_REALM`/`OAUTH_CLIENT_ID` env vars
- Authenticate via `start_oauth` — opens a browser for `authorization_code` environments; for `client_credentials` environments it fetches a token silently, no browser involved
- Sessions are saved to `~/.ifs-mcp/session.json`, keyed per environment, and persist across restarts
- Tokens are auto-refreshed (or, for `client_credentials`, re-fetched) when nearing expiry — the margin scales to the token's own lifetime (10%, floored at 5s, capped at 30s) rather than a fixed buffer, so short-lived tokens (some IFS environments issue client_credentials tokens under 5 minutes) don't get re-fetched before every single call
- Optional `sessionId`/`environment` parameters available to target a non-active environment for a single call
- For `client_credentials`, the client secret is supplied outside the chat (environment variable or `config.json`); no tool accepts it. See [Managing IFS Environments](../getting-started/ENVIRONMENTS.md#supplying-the-client-secret-client_credentials-only)
