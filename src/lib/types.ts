import { getEnvironment, authModeOf, IfsAuthMode } from "./config.js";

// API Configuration — resolves from the active IFS environment in
// ~/.ifs-mcp/config.json. Environment variables (API_BASE_URL etc.) still take
// precedence so existing .mcpb / CI setups keep working unchanged.
export const getApiBaseUrl = () => {
  const fromEnv = process.env.API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return (getEnvironment()?.apiBaseUrl || "").replace(/\/+$/, "");
};
export const getOAuthRealm = () =>
  process.env.OAUTH_REALM || getEnvironment()?.oauthRealm || "";
export const getOAuthClientId = () =>
  process.env.OAUTH_CLIENT_ID || getEnvironment()?.oauthClientId || "";

// OAuth 2.0 Configuration (public client — no client secret)
export interface OAuthConfig {
  readonly clientId: string;
  readonly authorizationUrl: string;
  readonly tokenUrl: string;
  readonly redirectUri: string;
  readonly scope: string;
}

export const OAUTH_CONFIG: OAuthConfig = {
  get clientId() { return getOAuthClientId(); },
  get authorizationUrl() { return `${getApiBaseUrl()}/auth/realms/${getOAuthRealm()}/protocol/openid-connect/auth`; },
  get tokenUrl() { return `${getApiBaseUrl()}/auth/realms/${getOAuthRealm()}/protocol/openid-connect/token`; },
  redirectUri: "http://localhost:3000/oauth/callback",
  scope: "openid",
};

// Per-environment resolution. A session key is an environment name (or "default"
// in legacy env-var mode); these derive that environment's base URL and OAuth
// endpoints deterministically so a token can never be paired with the wrong URL.
export function getApiBaseUrlForKey(key?: string): string {
  const env = key ? getEnvironment(key) : null;
  if (env) return env.apiBaseUrl.replace(/\/+$/, "");
  return getApiBaseUrl();
}

export interface OAuthParams {
  clientId: string;
  clientSecret?: string;
  tokenUrl: string;
  authMode: IfsAuthMode;
}

export function getOAuthParamsForKey(key?: string): OAuthParams {
  const env = key ? getEnvironment(key) : null;
  if (env) {
    const base = env.apiBaseUrl.replace(/\/+$/, "");
    return {
      clientId: env.oauthClientId,
      clientSecret: env.clientSecret,
      tokenUrl: `${base}/auth/realms/${env.oauthRealm}/protocol/openid-connect/token`,
      authMode: authModeOf(env),
    };
  }
  // Legacy env-var ("default") mode — always interactive authorization_code.
  // No client secret: this mode only supports a public OAuth client with PKCE.
  // Need client_credentials? Register an environment with add_ifs_environment instead.
  return {
    clientId: OAUTH_CONFIG.clientId,
    tokenUrl: OAUTH_CONFIG.tokenUrl,
    authMode: "authorization_code",
  };
}

// Token storage interface
export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  /** When this token was issued. Absent on sessions persisted before this
   * field existed — see refreshMarginMs() in oauth-manager.ts. */
  issuedAt?: number;
  userId: string;
}
