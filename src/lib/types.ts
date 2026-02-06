// API Configuration - accessed via getters to ensure dotenv has loaded first
export const getApiBaseUrl = () => process.env.API_BASE_URL || "";
export const getOAuthRealm = () => process.env.OAUTH_REALM || "";
export const getOAuthClientId = () => process.env.OAUTH_CLIENT_ID || "";
export const getOAuthClientSecret = () => process.env.OAUTH_CLIENT_SECRET || "";

// OAuth 2.0 Configuration
export interface OAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly authorizationUrl: string;
  readonly tokenUrl: string;
  readonly redirectUri: string;
  readonly scope: string;
}

export const OAUTH_CONFIG: OAuthConfig = {
  get clientId() { return getOAuthClientId(); },
  get clientSecret() { return getOAuthClientSecret(); },
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
