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
| OAuth tokens (access + refresh) | `~/.ifs-mcp/session.json`, keyed per environment |
| IFS environment registry (URL, realm, client ID per named environment) | `~/.ifs-mcp/config.json` |
| **Client secret** (only for environments using `client_credentials` auth mode) | `~/.ifs-mcp/config.json`, in plaintext, file permissions `0600` |
| OAuth Client ID (legacy single-environment / `.mcpb` setup) | `.env` file or the Claude Desktop extension's own settings, not this repo |
| Skill files (API guides) | `build/resources/*.md` in the server directory, or your configured skills directory |
| Session state | In-memory only, restored from disk on startup |

None of this data is transmitted to the developers of this tool, to Anthropic, or to any third party.

### What leaves your machine

| Traffic | Destination |
|---------|-------------|
| OAuth authentication flow | Your IFS Cloud instance and its identity provider (Keycloak) |
| API calls via `call_protected_api` | Your IFS Cloud instance only |
| Skill imports via `import_skill` | The HTTPS URL you specify — no other destination |
| Conversation content | Claude Desktop / Anthropic (governed by Anthropic's privacy policy) |

### What this tool does NOT do

- No telemetry, analytics, or usage tracking
- No calls to external services beyond your IFS Cloud instance and OAuth provider
- No logging of API responses or query results to disk
- No data sharing with the developers of this tool

---

## Use at Your Own Risk

This tool is provided **as-is**, without warranty of any kind. By using it, you accept the following:

- **You are responsible** for the OAuth credentials you configure. Treat your Client Secret like a password — do not share it, commit it to version control, or expose it in logs.
- **You are responsible** for the API calls made through this tool. Claude constructs and executes calls against your live IFS Cloud instance. Review the skill files to understand what operations they enable.
- **You are responsible** for any skill files you import from external URLs. Skill files are markdown and cannot execute code, but they instruct Claude on how to interact with your IFS instance. Only import skills from sources you trust.
- **No guarantees are made** about data integrity, availability, or correctness of API results. Do not use this tool as the sole basis for business-critical decisions without independent verification.
- The developers of this tool are **not liable** for any data loss, system disruption, or other consequences arising from its use.

This tool is intended for use by technical users who understand the implications of connecting an AI assistant to a live ERP system.

---

## Security Recommendations

### Protect your credentials

- **Never commit `.env` to version control.** The `.gitignore` in this repository excludes it, but verify this before pushing.
- **Prefer `authorization_code` (the default) over `client_credentials`** when a person is present to log in interactively. `authorization_code` uses a **public OAuth client** with PKCE — no long-lived secret is ever stored, and access is scoped to whichever IFS user account authenticates. `client_credentials` exists specifically for headless use (no browser available, e.g. automation or Claude Cowork) and requires a confidential client secret that is written to disk — only use it when interactivity genuinely isn't possible.
- If you need to revoke access, delete the session file (`rm ~/.ifs-mcp/session.json`) and remove or disable the OAuth client in **IFS Cloud IAM** if necessary.

### If you use `client_credentials` environments

Adding an environment with `authMode: "client_credentials"` (via the `add_ifs_environment` tool) writes its client secret to `~/.ifs-mcp/config.json` in **plaintext**. The file is created with `0600` permissions (owner read/write only), but unlike `session.json`'s access tokens — which expire and can be invalidated by re-authenticating — a leaked client secret is a standing credential until you rotate it in IFS Cloud IAM. Treat this file with the same care as `.env`:

- Use a **confidential client scoped to a dedicated service/integration account**, not a shared or administrative one.
- Mark the environment `readOnly: true` when it's used for reporting/read-only automation — `call_protected_api` will then block all non-GET methods against it, regardless of what the confidential client itself is permitted to do.
- If the machine running the MCP server is shared or you suspect compromise, rotate the client secret in IFS Cloud IAM and update the environment with `add_ifs_environment` (which overwrites the stored secret) or remove it with `remove_ifs_environment`.

### Protect your session file

The session file at `~/.ifs-mcp/session.json` contains refresh tokens that can be used to obtain access tokens for your IFS instance. Protect it accordingly:

- Ensure only your user account can read it (the file is created with default OS permissions — verify these on shared systems)
- Delete it with `rm ~/.ifs-mcp/session.json` to invalidate all local sessions if you suspect compromise

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

Run `npm audit` periodically to check for known vulnerabilities in the Node.js dependencies. Update with `npm update` and rebuild with `npx tsc`.

---

## Supported Versions

Security fixes are applied to the latest version only. If you are running an older version, update to the latest release before reporting issues.
