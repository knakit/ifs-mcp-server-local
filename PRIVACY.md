# Privacy Policy

**MCP Server for IFS Cloud** (`ifs-mcp-server-local`)

## What data is handled

This is a local [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server. It runs on your machine and is started by an MCP host, such as Claude Desktop (as an extension), Claude Code (as a plugin), Codex CLI, or any other AI application with MCP support. The data handling is identical whichever host you use. It handles the following data to enable authenticated access to IFS Cloud:

- **IFS Cloud URL, OAuth Realm, and Client ID** — provided by you, either through the host's extension settings (where it offers them) or by registering a named environment via the `add_ifs_environment` tool; used only to construct OAuth 2.0 requests to your own IFS Cloud instance. Stored locally at `~/.ifs-mcp/config.json` when using named environments.
- **Client secret** — only for environments using `authMode: "client_credentials"` (headless/service-account authentication). The server never asks for it and `add_ifs_environment` refuses to accept one, so it does not pass through the chat. You supply it yourself, either as the `IFS_CLIENT_SECRET_<NAME>` environment variable (nothing is written to disk by this server) or by adding a `clientSecret` entry to `~/.ifs-mcp/config.json` (stored there in plaintext). It is read only when requesting a token from your own IFS Cloud instance and is never logged or returned in tool output. See [Security](SECURITY.md#if-you-use-client_credentials-environments) for handling recommendations.
- **OAuth access and refresh tokens** — obtained during authentication with your IFS Cloud instance (for `client_credentials` environments, access tokens only); stored locally at `~/.ifs-mcp/session.json` on your machine, keyed per environment.
- **API responses** — data returned by your IFS Cloud APIs; processed in memory and returned to the MCP host and the AI model it uses. May be written to local CSV files (in `~/Downloads/` or `~/.ifs-mcp/exports/`) when using the `export_api_data` tool.
- **Skill files** — Markdown guide files written to your configured `SKILLS_DIR` or the server's local `resources/` directory.

## What data is NOT collected or transmitted

- This server contacts only your own IFS Cloud instance (OAuth and API calls) and, when you run `import_skill`, the URL you give it. It sends no data to the developer of this tool.
- No telemetry, analytics, or crash reporting is collected.
- OAuth tokens and client secrets are held **only on your local machine** and are used exclusively to authenticate requests to your own IFS Cloud instance.
- Data returned by your IFS Cloud APIs is passed to your MCP host. Depending on the host, it is likely to be sent on to the AI model provider that powers it. This server does not control that, or what the host or provider does with the conversation. Anything you type into the chat, or that a tool returns into it, is handled under that host's and provider's own privacy terms. This is why client secrets must never be pasted into chat; if one was, rotate it in IFS Cloud IAM.

## Local storage

| Location | Contents | Permissions |
|---|---|---|
| `~/.ifs-mcp/session.json` | OAuth tokens (access + refresh), keyed per environment | `0600` (owner read/write only) on macOS and Linux |
| `~/.ifs-mcp/config.json` | Registered IFS environments: URL, realm, client ID, and — only if you add it there yourself for a `client_credentials` environment — the client secret in plaintext | `0600` (owner read/write only) on macOS and Linux |
| `~/Downloads/` (or `~/.ifs-mcp/exports/` if there is no Downloads folder) | CSV exports from `export_api_data`: the full result data | Standard file permissions |
| System temp folder, `ifs-mcp/login-<state>.html` | The temporary login page for a browser login: the authorization URL, client ID and PKCE challenge. No tokens. Not deleted automatically | Standard file permissions |
| `SKILLS_DIR` or `build/resources/` | Skill Markdown files | Standard file permissions |

On Windows, Node's `chmod` does not set file permissions, so the `0600` entries above do not restrict access there. Protect your user profile folder with ordinary account permissions or disk encryption.

## OAuth flow

By default, authentication uses OAuth 2.0 with PKCE (Proof Key for Code Exchange). The callback server listens **exclusively on `127.0.0.1:3000`** (localhost only). It starts the first time a browser login is needed and keeps listening until your MCP host stops the server; it is not started at all for `client_credentials` environments.

Environments configured with `authMode: "client_credentials"` skip this browser/callback flow entirely — the server exchanges the client secret (from the environment variable or `config.json`) directly with your IFS Cloud instance's token endpoint (machine-to-machine), with no browser or localhost callback involved.

## Contact

For questions or concerns, open an issue at <https://github.com/knakit/ifs-mcp-server-local/issues>.
