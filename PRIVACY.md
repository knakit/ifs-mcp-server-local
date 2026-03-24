# Privacy Policy

**IFS Cloud MCP Server** (`ifs-mcp-server-local`)

## What data is handled

This extension handles the following data to enable authenticated access to IFS Cloud:

- **IFS Cloud URL, OAuth Realm, and Client ID** — provided by the user in configuration; used only to construct OAuth 2.0 requests to your own IFS Cloud instance.
- **OAuth access and refresh tokens** — obtained during the OAuth 2.0 PKCE flow with your IFS Cloud instance; stored locally at `~/.ifs-mcp/session.json` on your machine.
- **API responses** — data returned by your IFS Cloud APIs; processed in memory and returned to the MCP client (Claude). May be written to local CSV files (in `~/Downloads/` or `~/.ifs-mcp/exports/`) when using the `export_api_data` tool.
- **Skill files** — Markdown guide files written to your configured `SKILLS_DIR` or the extension's local `resources/` directory.

## What data is NOT collected or transmitted

- No data is sent to Anthropic, the extension author, or any third party.
- No telemetry, analytics, or crash reporting is collected.
- OAuth tokens are stored **only on your local machine** and are used exclusively to authenticate requests to your own IFS Cloud instance.

## Local storage

| Location | Contents | Permissions |
|---|---|---|
| `~/.ifs-mcp/session.json` | OAuth tokens (access + refresh) | `0600` (owner read/write only) |
| `~/.ifs-mcp/exports/` | CSV exports (if Downloads not found) | Created on demand |
| `SKILLS_DIR` or `build/resources/` | Skill Markdown files | Standard file permissions |

## OAuth flow

Authentication uses OAuth 2.0 with PKCE (Proof Key for Code Exchange). The callback server listens **exclusively on `127.0.0.1:3000`** (localhost only) and only starts when the `start_oauth` tool is called — it is not running at all other times.

## Contact

For questions or concerns, open an issue at <https://github.com/knakit/ifs-mcp-server-local/issues>.
