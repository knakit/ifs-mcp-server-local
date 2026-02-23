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
| OAuth tokens (access + refresh) | `~/.ifs-mcp/session.json` |
| OAuth Client ID | `.env` file in the server directory |
| Skill files (API guides) | `build/resources/*.md` in the server directory |
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
- This tool uses a **public OAuth client** with PKCE. The OAuth client itself holds no special grants — access is determined entirely by the IFS user account that authenticates. Ensure the user account you log in with has only the IFS roles and permissions needed for your intended workflows.
- If you need to revoke access, delete the session file (`rm ~/.ifs-mcp/session.json`) and remove or disable the OAuth client in **IFS Cloud IAM** if necessary.

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
