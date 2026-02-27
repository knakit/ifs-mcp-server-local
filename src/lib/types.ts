// API Configuration - accessed via getters to ensure dotenv has loaded first
export const getApiBaseUrl = () => (process.env.API_BASE_URL || "").replace(/\/+$/, "");
export const getOAuthRealm = () => process.env.OAUTH_REALM || "";
export const getOAuthClientId = () => process.env.OAUTH_CLIENT_ID || "";

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

// Token storage interface
export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  userId: string;
}
