# Security Policy

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please report it privately via [GitHub Security Advisories](https://github.com/knakit/ifs-mcp-server-local/security/advisories/new). Include:

- A description of the vulnerability
- Steps to reproduce it
- The potential impact
- Any suggested fixes (optional)

You can expect an acknowledgement within 5 business days. We will work with you to understand and address the issue before any public disclosure.

---

## Data Handling

This tool is designed to keep your data local. Understanding what stays on your machine and what leaves it is important when connecting any tool to an ERP system.

### What stays on your machine

| Data | Where it's stored |
|------|-------------------|
| OAuth tokens (access + refresh; access only for `client_credentials`) | `~/.ifs-mcp/session.json`, keyed per environment, file permissions `0600` on macOS/Linux |
| IFS environment registry (URL, realm, client ID per named environment) | `~/.ifs-mcp/config.json` |
| **Client secret** (only for environments using `client_credentials` auth mode) | Only where you put it: the `IFS_CLIENT_SECRET_<NAME>` environment variable (not written to disk by this tool), or a `clientSecret` entry you add to `~/.ifs-mcp/config.json` yourself, in plaintext, file permissions `0600` on macOS/Linux. It is never accepted through chat |
| OAuth Client ID (legacy single-environment / `.mcpb` setup) | `.env` file or the Claude Desktop extension's own settings, not this repo |
| Skill files (API guides) | `build/resources/*.md` in the server directory, or your configured skills directory |
| CSV exports | `~/Downloads/` (or `~/.ifs-mcp/exports/`), full result data, standard file permissions |
| Temporary login page | System temp folder, `ifs-mcp/login-<state>.html`: authorization URL, client ID and PKCE challenge, no tokens; not deleted automatically |
| Session state | In-memory only, restored from disk on startup |

This server does not send this data to the developers of this tool. Some of it (environment names, URL, realm, whether a secret is configured) is returned by tools into the conversation, which your MCP host may pass on to its AI model provider (see below). The server itself only talks to your IFS Cloud instance and, for `import_skill`, the URL you specify.

### What leaves your machine

| Traffic | Destination |
|---------|-------------|
| OAuth authentication flow | Your IFS Cloud instance and its identity provider (Keycloak) |
| API calls via `call_protected_api` | Your IFS Cloud instance only |
| Skill imports via `import_skill` | The HTTPS URL you specify, and any HTTPS address it redirects to (up to 3 redirects). `import_skill` also accepts an absolute local file path |
| Conversation content, including data returned by IFS API calls | Your MCP host (e.g. Claude Desktop, Claude Code, Codex CLI) and, depending on the host, its AI model provider — governed by their privacy policies, not controlled by this server |

### What this tool does NOT do

- No telemetry, analytics, or usage tracking
- No calls to external services beyond your IFS Cloud instance and OAuth provider
- No logging of API responses or query results to disk
- No data sharing with the developers of this tool

---

## Use at Your Own Risk

This tool is provided **as-is**, without warranty of any kind. By using it, you accept the following:

- **You are responsible** for the OAuth credentials you configure. Treat your Client Secret like a password — do not share it, commit it to version control, paste it into a chat, or expose it in logs.
- **You are responsible** for the API calls made through this tool. Claude constructs and executes calls against your live IFS Cloud instance. Review the skill files to understand what operations they enable.
- **You are responsible** for any skill files you import from external URLs. Skill files are markdown and cannot execute code, but they instruct Claude on how to interact with your IFS instance. Only import skills from sources you trust.
- **No guarantees are made** about data integrity, availability, or correctness of API results. Do not use this tool as the sole basis for business-critical decisions without independent verification.
- The developers of this tool are **not liable** for any data loss, system disruption, or other consequences arising from its use.

This tool is intended for use by technical users who understand the implications of connecting an AI assistant to a live ERP system.

---

## Security Recommendations

### Protect your credentials

- **Never commit `.env` to version control.** The `.gitignore` in this repository excludes it, but verify this before pushing.
- **Prefer `authorization_code` (the default) over `client_credentials`** when a person is present to log in interactively. `authorization_code` uses a **public OAuth client** with PKCE — no client secret is ever stored (the login does leave a refresh token in `session.json`, see below), and access is scoped to whichever IFS user account authenticates. `client_credentials` exists specifically for headless use (no browser available, e.g. automation or Claude Cowork) and requires a confidential client secret that you must supply yourself (environment variable or `config.json`) — only use it when interactivity genuinely isn't possible.
- If you need to revoke access, stop your MCP host, delete the session file (`rm ~/.ifs-mcp/session.json`), and revoke the session or disable the OAuth client in **IFS Cloud IAM**. Deleting the file does not invalidate tokens IFS has already issued; they stay valid until they expire.

### If you use `client_credentials` environments

The `add_ifs_environment` tool registers a `client_credentials` environment but never accepts a client secret, and refuses one if it is passed, so the secret does not pass through the chat. You supply it yourself in one of two ways:

- **Environment variable (preferred):** set `IFS_CLIENT_SECRET_<NAME>` before the host starts (`<NAME>` is the environment name in upper case, other characters replaced by `_`). The server writes nothing to disk for this.
- **`config.json`:** add `"clientSecret": "..."` inside the environment's entry in `~/.ifs-mcp/config.json`. It is stored in **plaintext**. The file is created with `0600` permissions (owner read/write only).

The secret is read in one place only (when requesting a token from IFS) and is never logged or returned in tool output; token-request errors are rewritten so they cannot contain it. Unlike the tokens in `session.json`, which expire, a leaked client secret is a standing credential until you rotate it in IFS Cloud IAM. Treat the secret, and `config.json` if it holds one, with the same care as `.env`. If you pasted a secret into a chat by mistake, rotate it in IFS Cloud IAM straight away:

- Use a **confidential client scoped to a dedicated service/integration account**, not a shared or administrative one.
- Mark the environment `readOnly: true` when it's used for reporting/read-only automation — every API tool (`call_protected_api` and `export_api_data`) will then block all non-GET methods against it, regardless of what the confidential client itself is permitted to do. It is a guard rail, not a hard security boundary: an agent that can call `add_ifs_environment` could change the flag, so for a hard limit also give the IFS user only read permission sets.
- If the machine running the MCP server is shared or you suspect compromise, rotate the client secret in IFS Cloud IAM and update the environment variable or the `clientSecret` entry in `config.json`, or remove the environment with `remove_ifs_environment`. Re-running `add_ifs_environment` does not change a stored secret.

### Protect your session file

The session file at `~/.ifs-mcp/session.json` contains refresh tokens that can be used to obtain access tokens for your IFS instance. Protect it accordingly:

- The file is created with owner-only permissions (`0600`) on macOS and Linux. **On Windows this does not restrict access** (Node's `chmod` doesn't set Windows permissions), so protect your user profile with normal account permissions or disk encryption, and verify permissions on shared systems
- If you suspect compromise: stop your MCP host, delete `~/.ifs-mcp/session.json` to remove the local copies, and revoke the session or client in IFS Cloud IAM. A running server also keeps tokens in memory, and tokens already issued stay valid at IFS until they expire

### Be careful with skill imports

`import_skill` fetches content from a URL and saves it to your skills directory. Before importing a skill from an external source:

- Check that the URL points to a trusted source (e.g. the official repository or a colleague's verified GitHub account)
- Review the `.md` file content before running queries — the skill tells Claude which endpoints to call and how

### Test in a non-production environment first

Before using this tool against your live IFS instance, test it in a **development or test environment**:

- Verify that the skill files call the correct endpoints and return the expected data
- Check that filters work as intended and don't accidentally retrieve sensitive records
- Confirm that any write operations (POST, PATCH, actions) behave correctly before running them in production
- Validate that the OAuth client and user permissions are scoped appropriately

IFS typically provides test and development environments — use them. Mistakes made against a live production system (wrong filters, bulk operations, unintended record creation) can be difficult to reverse.

### Keep dependencies updated

Run `npm audit` periodically to check for known vulnerabilities in the Node.js dependencies. Update with `npm update` and rebuild with `npm run build`.

---

## Supported Versions

Security fixes are applied to the latest version only. If you are running an older version, update to the latest release before reporting issues.
