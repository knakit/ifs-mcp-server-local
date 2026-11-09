# FAQ

> **Draft.** Items marked **[verify]** have not been confirmed yet.

- [Data flow and privacy](#data-flow-and-privacy)
- [Setup and cleanup](#setup-and-cleanup)

---

## Data flow and privacy

### Where does my IFS data go?

The MCP Server for IFS Cloud runs on your machine. It sits between two other parties:

```
 IFS Cloud  <──────────>  MCP Server for IFS Cloud  <──────────>  MCP host            <──────────>  AI model provider
 (your instance)          (local, on your machine)               (Claude Desktop,                   (the LLM service
                                                                  Claude Code, Codex CLI, …)         behind the host)
                          ▲ authenticates, calls APIs,
                            writes files, reads skills
```

1. **Server ↔ IFS Cloud.** The server authenticates (OAuth 2.0) and calls the IFS APIs. This is the only place it sends requests for your data, apart from `import_skill`, which fetches the URL you give it.
2. **Server → MCP host.** Whatever a tool *returns* goes to the host as a tool result and becomes part of the conversation.
3. **Host → AI model provider.** The host sends the conversation to the model so it can answer. **This server does not control this step.** In most hosts the model provider is a cloud service. A host configured with a local model keeps it on your machine.

The server itself sends nothing to its developer and has no telemetry. What reaches the AI model is decided by *what the tools return* (step 2) and by your host and provider (step 3).

### When does IFS data reach the AI model?

Anything that appears in the conversation is sent to the model, and in most hosts it is sent again on later turns while it stays in the conversation history. This table shows what each action puts into the conversation.

| What happens | What the model sees | What stays local |
|---|---|---|
| **You type a message** (including URLs, IDs, names) | All of it | — |
| **`call_protected_api`** (a normal query) | **The full response from IFS**: every record and field returned. A response that is a list of records is summarised only if it is over about 100 KB (next row); a single record or other object is returned in full whatever its size | Nothing. Use `$select` and `$top` to limit what comes back |
| **`call_protected_api`**, a list of records over 100 KB | A summary: record count, field names and **one complete sample record**, plus options (preview, narrow, export) | The remaining records |
| **`call_protected_api`**, an error | IFS's error message and details | — |
| **`export_api_data`** | Only the record count, field names and the file path of the CSV | **The records themselves.** They are fetched page by page and written to a CSV in `~/Downloads` (or `~/.ifs-mcp/exports`) without passing through the model |
| **`get_api_guide`** | The text of a skill (API guide). No IFS data, unless a skill's author put example values in it | — |
| **`import_skill` / `save_skill`** | A confirmation: skill title, filename and saved path (not the content). A saved skill is read by the model later, through `get_api_guide` | The skill file |
| **`parse_har_file`** | A summary of your recording: the operations, how often each was called, the `$select` field names, filter patterns and request body keys. String values in `eq`/`ne` and `contains` filters, dates and some numbers are masked; other comparisons (`ge`, `le`, `startswith`, `in`) are not. Record keys in URL paths are not included | The HAR file itself, all response data and request body values |
| **`read_openapi_file`** | A summary of the spec: entity names, field names and enum values (metadata, not records) | The spec file |
| **Live `$openapi` fetch** (building a skill from a projection name) | The raw spec JSON, because it goes through `call_protected_api` (metadata, not records) | — |
| **Navigator lookup** (finding a projection) | Navigator labels, projection and client names | — |
| **`list_ifs_environments` / `use_ifs_environment`** | Environment names, IFS URL, realm, auth mode, read-only flag, where a client secret comes from and its variable name (never its value), login status, and the home directory and `config.json` path | The contents of `config.json` beyond that |
| **`get_session_info`** | Session ID (the environment name), expiry time and whether it can be refreshed. No IFS user ID | The tokens |
| **OAuth login and token refresh** | The outcome, plus the path of a temporary login page and the one-time `state` value (no tokens). Refreshes are invisible to the model | Access and refresh tokens (`~/.ifs-mcp/session.json`) |
| **Client secret** | Never. The server accepts none through chat, never logs it and never returns it | The environment variable or `config.json` |

**In short:** IFS records reach the AI model only when a tool returns them into the conversation. In practice that means `call_protected_api` responses (all of them, or one sample record for large results). A bulk `export_api_data` does not send the records to the model, but anything you then ask the model to read from the CSV will be sent. The tools never return credentials or tokens.

### Does the model send anything to IFS by itself?

The model decides which tool to call and with which parameters, but the server executes them. Calls are made as the logged-in IFS user (or the service account for `client_credentials`), so IFS permissions apply. For environments marked `readOnly`, the server blocks every method except GET, in both `call_protected_api` and `export_api_data`. That flag is a guard rail rather than a hard boundary (an agent that can call `add_ifs_environment` could change it), so for a hard limit give the IFS user only read permission sets. Review any create, update or delete request before approving it in your host.

### How can I limit what reaches the AI model?

- **Ask for less.** Have the model use `$select` and `$top`, or query one record at a time.
- **Export bulk data** with `export_api_data` instead of listing it in chat.
- **Use a restricted account.** A dedicated service user with only the permission sets it needs limits both what the model can read and what it can change. Mark the environment `readOnly` for reporting.
- **Pick the host and plan to match your data policy.** Check your provider's retention and training terms (for example enterprise or zero-retention plans), or use a host with a local model.
- **Never paste secrets into chat.** Anything typed in chat goes to the model. If you did, rotate the secret in IFS IAM.

### What does the server store on my machine?

See [PRIVACY.md](../PRIVACY.md) for the full table: OAuth tokens in `~/.ifs-mcp/session.json`, environments in `config.json`, CSV exports, and skill files. Nothing is sent from there to anyone except your IFS Cloud instance.

---

## Setup and cleanup

### Why is `~/.ifs-mcp` still there after I uninstall?
Uninstalling the extension or plugin removes only its own files. `~/.ifs-mcp` is created by the server at runtime, outside the plugin folder, and is shared by every host, so no single uninstall clears it. There is no uninstall hook.

It can contain: `config.json` (environments, and a client secret if you added one), `session.json` (OAuth tokens) and `exports/` (CSVs, only used when `~/Downloads` doesn't exist). Older versions may also have left `session.backup-*.json` files or a `skills/` folder, so check before deleting. Skills are not stored here: they live in your `SKILLS_DIR`, or inside the extension or plugin's own `build/resources` folder, which an uninstall removes. A temporary login page is also written to your system temp folder under `ifs-mcp/`.

To clean up, delete `config.json` and `session.json` to remove credentials and tokens, or remove the whole folder. After removal, rotate any client secret that was stored there or pasted into a chat. Deleting the files does not revoke tokens IFS has already issued; see [Security](../SECURITY.md#protect-your-session-file).

On Windows the `0600` file permission mentioned in the privacy and security documents does not restrict access, because Node's `chmod` doesn't set Windows permissions. Protect the folder with ordinary account permissions.

### Why is my IFS client ID rejected?
IFS limits client and user IDs to 20 characters. Use short names such as `ifs-mcp` (public client) and `ifs-mcp-service` (confidential client).

### Why does Cowork warn "This plugin includes local MCP servers"?
Cowork shows this for any plugin that launches a local command; this plugin runs `node build/index.js`. It is a trust prompt, not an error. Install only from the official release. **[verify]** Whether the server runs on your computer or in a VM in Cowork.

### Still to write
- Port 3000 conflicts when two logins overlap
- The `API_BASE_URL` environment variable overriding the environment registry
- The "which environment?" refusal when several are registered
- A service user with no permission sets
- `diagnostics` showing a different home directory (WSL versus native Windows)
