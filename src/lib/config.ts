import fs from "fs";
import path from "path";
import os from "os";

// Multi-environment configuration for IFS Cloud instances.
// Stored alongside sessions in ~/.ifs-mcp/ so it persists across app updates.

const CONFIG_DIR = path.join(os.homedir(), ".ifs-mcp");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

/**
 * How an environment authenticates:
 * - "authorization_code": interactive browser login as the end user (default).
 * - "client_credentials": machine-to-machine using a confidential client secret.
 *   No browser/localhost needed, so it works headless (e.g. inside Cowork's VM),
 *   but every call runs as the integration/service account, not the end user.
 */
export type IfsAuthMode = "authorization_code" | "client_credentials";

/**
 * A registered environment. Deliberately has no client secret: nothing outside
 * getClientSecret() below ever sees one. The secret is supplied out of band —
 * an env var or a hand-edited `clientSecret` in config.json — never through chat.
 */
export interface IfsEnvironment {
  apiBaseUrl: string;
  oauthRealm: string;
  oauthClientId: string;
  /** Defaults to "authorization_code". */
  authMode?: IfsAuthMode;
  /** When true, call_protected_api blocks non-GET methods for this environment. */
  readOnly?: boolean;
}

/** On-disk shape. Only this file's internals handle the `clientSecret` field. */
interface StoredEnvironment extends IfsEnvironment {
  clientSecret?: string;
}

interface StoredConfig {
  activeEnv: string | null;
  environments: Record<string, StoredEnvironment>;
}

/** Where a client_credentials environment's secret comes from. Never the value itself. */
export type ClientSecretSource = "env" | "config" | "missing";

/** Effective auth mode for an environment (defaults to authorization_code). */
export function authModeOf(env: IfsEnvironment | null | undefined): IfsAuthMode {
  return env?.authMode === "client_credentials" ? "client_credentials" : "authorization_code";
}

export interface IfsConfig {
  activeEnv: string | null;
  environments: Record<string, IfsEnvironment>;
}

function ensureDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

// Reads config.json as stored, including any hand-edited `clientSecret`.
// Private: it exists so add/use/remove can rewrite the file without dropping a
// secret the user added by hand. Callers outside this module get loadConfig().
function readStoredConfig(): StoredConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      return {
        activeEnv: raw.activeEnv ?? null,
        environments: raw.environments ?? {},
      };
    }
  } catch {
    // fall through to empty config
  }
  return { activeEnv: null, environments: {} };
}

function writeStoredConfig(config: StoredConfig) {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  try {
    fs.chmodSync(CONFIG_FILE, 0o600);
  } catch {
    // chmod unsupported (e.g. some Windows setups) — non-fatal
  }
}

/** Copy of a stored config with every client secret removed. */
function withoutSecrets(stored: StoredConfig): IfsConfig {
  const environments: Record<string, IfsEnvironment> = {};
  for (const [name, env] of Object.entries(stored.environments)) {
    const { clientSecret: _omit, ...publicEnv } = env;
    environments[name] = publicEnv;
  }
  return { activeEnv: stored.activeEnv, environments };
}

/** Config as seen by every tool: environments only, never a client secret. */
export function loadConfig(): IfsConfig {
  return withoutSecrets(readStoredConfig());
}

/** Name of the currently selected environment, or null. */
export function getActiveEnvName(): string | null {
  return loadConfig().activeEnv;
}

/**
 * Key used to store/look up the OAuth token for the current context.
 * Equals the active environment name, or "default" in legacy env-var mode
 * (API_BASE_URL set without any configured environments). null if neither.
 */
export function getActiveSessionKey(): string | null {
  const config = loadConfig();
  if (config.activeEnv) return config.activeEnv;
  if (process.env.API_BASE_URL) return "default";
  return null;
}

/** Resolve a named environment, defaulting to the active one. */
export function getEnvironment(name?: string): IfsEnvironment | null {
  const config = loadConfig();
  const key = name ?? config.activeEnv;
  if (!key) return null;
  return config.environments[key] ?? null;
}

export function listEnvironments(): IfsConfig {
  return loadConfig();
}

/**
 * Register or update an environment. Takes no secret: an existing `clientSecret`
 * the user added to config.json by hand is carried over untouched so that
 * re-running this never deletes it.
 */
export function addEnvironment(name: string, env: IfsEnvironment): IfsConfig {
  const stored = readStoredConfig();
  const existingSecret = stored.environments[name]?.clientSecret;
  stored.environments[name] = {
    apiBaseUrl: env.apiBaseUrl.replace(/\/+$/, ""),
    oauthRealm: env.oauthRealm,
    oauthClientId: env.oauthClientId,
    ...(env.authMode === "client_credentials" ? { authMode: "client_credentials" as const } : {}),
    ...(env.readOnly ? { readOnly: true } : {}),
    ...(existingSecret ? { clientSecret: existingSecret } : {}),
  };
  // First environment added becomes active automatically.
  if (!stored.activeEnv) stored.activeEnv = name;
  writeStoredConfig(stored);
  return withoutSecrets(stored);
}

export function useEnvironment(name: string): IfsConfig {
  const stored = readStoredConfig();
  if (!stored.environments[name]) {
    throw new Error(`Environment '${name}' not found. Add it with add_ifs_environment first.`);
  }
  stored.activeEnv = name;
  writeStoredConfig(stored);
  return withoutSecrets(stored);
}

/**
 * Non-secret diagnostics: where this process resolved its home directory and
 * config file. A host that launches the server in an unexpected context
 * (e.g. a different user profile, or WSL vs native Windows) can silently
 * resolve a different config.json than the one you edited — this makes that
 * visible instead of just reporting "no environment configured".
 */
export function getConfigDiagnostics(): { homeDir: string; configFile: string } {
  return { homeDir: os.homedir(), configFile: CONFIG_FILE };
}

export function removeEnvironment(name: string): IfsConfig {
  const stored = readStoredConfig();
  delete stored.environments[name];
  if (stored.activeEnv === name) {
    const remaining = Object.keys(stored.environments);
    stored.activeEnv = remaining.length === 1 ? remaining[0] : null;
  }
  writeStoredConfig(stored);
  return withoutSecrets(stored);
}

/** Env var that supplies an environment's client secret: IFS_CLIENT_SECRET_<NAME>. */
export function clientSecretEnvVar(name: string): string {
  return `IFS_CLIENT_SECRET_${name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
}

/**
 * Where an environment's client secret is configured — never the secret itself.
 * Presence checks only; safe for list/add/diagnostic output.
 */
export function clientSecretSource(name: string): ClientSecretSource {
  if (process.env[clientSecretEnvVar(name)]) return "env";
  if (readStoredConfig().environments[name]?.clientSecret) return "config";
  return "missing";
}

/**
 * Returns an environment's client secret: the IFS_CLIENT_SECRET_<NAME> env var
 * first, then a `clientSecret` hand-edited into config.json.
 *
 * ONLY OAuthManager.clientCredentialsToken() may call this — it is the one place
 * a secret is used. scripts/check-secret-access.mjs enforces that in CI. Never
 * log, return, or include the result in any tool output.
 */
export function getClientSecret(name: string): string | undefined {
  const fromEnv = process.env[clientSecretEnvVar(name)];
  if (fromEnv) return fromEnv;
  return readStoredConfig().environments[name]?.clientSecret || undefined;
}
