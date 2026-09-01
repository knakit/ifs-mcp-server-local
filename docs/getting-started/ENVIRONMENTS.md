# Managing IFS Environments

An **environment** is a named IFS Cloud instance — its URL, OAuth realm, client ID, and how it authenticates. Most setups only ever need one (e.g. `prod`), but you can register several — `dev`, `test`, `prod` — and switch between them without restarting anything.

This is the only configuration mechanism available in **Claude Code** and **Codex CLI**, since neither has a settings dialog. In **Claude Desktop**, it's an alternative to the classic single-environment settings screen — use whichever fits your setup.

---

## Two ways to configure — don't mix them

| | Where it lives | Environments | Auth modes |
|---|---|---|---|
| **Environment variables** (legacy) | `.env` file, or Desktop's Settings → Extensions dialog | One | `authorization_code` only |
| **Environment registry** (this page) | `~/.ifs-mcp/config.json` | Any number, named | `authorization_code` or `client_credentials` |

**If `API_BASE_URL` is set as an environment variable, it always wins** — the registry is ignored entirely, even if you've added environments to it. This exists so existing `.mcpb`/CI setups keep working unchanged. If you want to use the registry, make sure `API_BASE_URL` isn't set anywhere the server can see it (unset it from Desktop's extension settings, or don't set it in `.env`).

---

## Adding an environment

Just ask Claude — this calls the `add_ifs_environment` tool:

> *"Add an IFS environment called prod, url https://your-tenant.ifs.cloud, realm yourrealm, client id YOUR_CLIENT_ID"*

The **first environment you add becomes active automatically**. Add more the same way — each needs its own name.

**Fields:**

| Field | Required | Description |
|-------|----------|--------------|
| `name` | Yes | Short identifier — `prod`, `test`, `dev` |
| `apiBaseUrl` | Yes | Your IFS Cloud instance URL |
| `oauthRealm` | Yes | The OAuth realm (Solution Manager → Setup → System Parameters → Namespace) |
| `oauthClientId` | Yes | A public client ID for `authorization_code`, or a confidential client ID for `client_credentials` |
| `authMode` | No — defaults to `authorization_code` | See below |
| `clientSecret` | Only for `client_credentials` | The confidential client's secret |
| `readOnly` | No | When `true`, blocks all non-`GET` calls against this environment |

---

## Choosing an auth mode

| | `authorization_code` (default) | `client_credentials` |
|---|---|---|
| **How you log in** | Browser redirect, as yourself | No browser — machine-to-machine |
| **Needs** | A public OAuth client, a browser, `localhost:3000` reachable | A confidential OAuth client + secret |
| **Runs as** | The IFS user account that logs in | The integration/service account tied to the client |
| **Works headless** (Claude Cowork, CI, no display) | No | Yes |
| **Where the secret lives** | Nowhere — PKCE needs no secret | `~/.ifs-mcp/config.json`, plaintext, `0600` — see [Security](../../SECURITY.md#if-you-use-client_credentials-environments) |

Default to `authorization_code` whenever a person is actually present to click through a login. Reach for `client_credentials` only when there's no browser available — that's the entire reason it exists.

`client_credentials` needs a **confidential** OAuth client (not the public client used for `authorization_code`), with a dedicated service user that's been granted the Permission Sets for the projections you'll call — see [Installation, Step 1 Option B](INSTALLATION.md#option-b--confidential-client-for-headless-auth-client_credentials) for how to create one.

---

## Switching, listing, and removing

- **`list_ifs_environments`** — shows every registered environment, which one is active, and whether it's currently authenticated.
- **`use_ifs_environment`** — *"switch to test"* — changes which environment subsequent calls target. Each environment keeps its own saved session, so switching back to `prod` doesn't log you out of it.
- **`remove_ifs_environment`** — deletes an environment and its saved session/token together.

If more than one environment is registered and none is selected, tools that hit IFS Cloud (`call_protected_api`, `export_api_data`, `start_oauth`) refuse to guess — they'll ask which environment to use rather than silently defaulting to one. Mark a production environment `readOnly: true` as an extra safety net against accidental writes.

---

## Per-call overrides

`call_protected_api` and `export_api_data` accept an optional `environment` argument to target a different environment for a single call without switching the active one:

```
call_protected_api({ environment: "test", endpoint: "...", method: "GET" })
```

---

## Next steps

- [Installation](INSTALLATION.md) — first-time setup for Claude Desktop or Claude Code
- [Security](../../SECURITY.md) — how client secrets and sessions are protected
- [Tools Reference](../reference/TOOLS.md) — full argument reference for every tool mentioned here
