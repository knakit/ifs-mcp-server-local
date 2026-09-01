# Privacy Policy

**IFS Cloud MCP Server** (`ifs-mcp-server-local`)

## What data is handled

This server (installed either as a Claude Desktop extension or a Claude Code plugin — the data handling is identical either way) handles the following data to enable authenticated access to IFS Cloud:

- **IFS Cloud URL, OAuth Realm, and Client ID** — provided by you, either through Claude Desktop's extension settings or by registering a named environment via the `add_ifs_environment` tool; used only to construct OAuth 2.0 requests to your own IFS Cloud instance. Stored locally at `~/.ifs-mcp/config.json` when using named environments.
- **Client secret** — only if you register an environment with `authMode: "client_credentials"` (headless/service-account authentication). Stored locally at `~/.ifs-mcp/config.json` in plaintext. See [Security](SECURITY.md#if-you-use-client_credentials-environments) for handling recommendations.
- **OAuth access and refresh tokens** — obtained during authentication with your IFS Cloud instance; stored locally at `~/.ifs-mcp/session.json` on your machine, keyed per environment.
- **API responses** — data returned by your IFS Cloud APIs; processed in memory and returned to the MCP client (Claude). May be written to local CSV files (in `~/Downloads/` or `~/.ifs-mcp/exports/`) when using the `export_api_data` tool.
- **Skill files** — Markdown guide files written to your configured `SKILLS_DIR` or the server's local `resources/` directory.

## What data is NOT collected or transmitted

- No data is sent to Anthropic, the developer of this tool, or any third party.
- No telemetry, analytics, or crash reporting is collected.
- OAuth tokens and client secrets are stored **only on your local machine** and are used exclusively to authenticate requests to your own IFS Cloud instance.

## Local storage

| Location | Contents | Permissions |
|---|---|---|
| `~/.ifs-mcp/session.json` | OAuth tokens (access + refresh), keyed per environment | `0600` (owner read/write only) |
| `~/.ifs-mcp/config.json` | Registered IFS environments: URL, realm, client ID, and — for `client_credentials` environments only — client secret in plaintext | `0600` (owner read/write only) |
| `~/.ifs-mcp/exports/` | CSV exports (if Downloads not found) | Created on demand |
| `SKILLS_DIR` or `build/resources/` | Skill Markdown files | Standard file permissions |

## OAuth flow

By default, authentication uses OAuth 2.0 with PKCE (Proof Key for Code Exchange). The callback server listens **exclusively on `127.0.0.1:3000`** (localhost only) and only starts when the `start_oauth` tool is called — it is not running at all other times.

Environments configured with `authMode: "client_credentials"` skip this browser/callback flow entirely — the server exchanges the stored client secret directly with your IFS Cloud instance's token endpoint (machine-to-machine), with no browser or localhost callback involved.

## Contact

For questions or concerns, open an issue at <https://github.com/knakit/ifs-mcp-server-local/issues>.
