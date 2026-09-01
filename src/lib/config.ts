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

export interface IfsEnvironment {
  apiBaseUrl: string;
  oauthRealm: string;
  oauthClientId: string;
  /** Defaults to "authorization_code". */
  authMode?: IfsAuthMode;
  /** Required when authMode === "client_credentials". Confidential client secret. */
  clientSecret?: string;
  /** When true, call_protected_api blocks non-GET methods for this environment. */
  readOnly?: boolean;
}

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

export function loadConfig(): IfsConfig {
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

export function saveConfig(config: IfsConfig) {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  try {
    fs.chmodSync(CONFIG_FILE, 0o600);
  } catch {
    // chmod unsupported (e.g. some Windows setups) — non-fatal
  }
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

export function addEnvironment(name: string, env: IfsEnvironment): IfsConfig {
  const config = loadConfig();
  config.environments[name] = {
    apiBaseUrl: env.apiBaseUrl.replace(/\/+$/, ""),
    oauthRealm: env.oauthRealm,
    oauthClientId: env.oauthClientId,
    ...(env.authMode === "client_credentials" ? { authMode: "client_credentials" as const } : {}),
    ...(env.clientSecret ? { clientSecret: env.clientSecret } : {}),
    ...(env.readOnly ? { readOnly: true } : {}),
  };
  // First environment added becomes active automatically.
  if (!config.activeEnv) config.activeEnv = name;
  saveConfig(config);
  return config;
}

export function useEnvironment(name: string): IfsConfig {
  const config = loadConfig();
  if (!config.environments[name]) {
    throw new Error(`Environment '${name}' not found. Add it with add_ifs_environment first.`);
  }
  config.activeEnv = name;
  saveConfig(config);
  return config;
}

export function removeEnvironment(name: string): IfsConfig {
  const config = loadConfig();
  delete config.environments[name];
  if (config.activeEnv === name) {
    const remaining = Object.keys(config.environments);
    config.activeEnv = remaining.length === 1 ? remaining[0] : null;
  }
  saveConfig(config);
  return config;
}
