import crypto from "crypto";
import axios from "axios";
import { OAUTH_CONFIG, TokenData, getOAuthParamsForKey } from "../types.js";
import { tokenStore } from "./token-store.js";
import { saveSession } from "./session-manager.js";
import { getActiveSessionKey } from "../config.js";

// PKCE helper functions
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

const PENDING_AUTH_TTL_MS = 10 * 60 * 1000; // 10 minutes

// OAuth flow manager
export class OAuthManager {
  private pendingAuths = new Map<string, {
    codeVerifier: string;
    state: string;
    sessionKey: string;
  }>();

  // Start OAuth flow
  startAuthFlow(): { authUrl: string; state: string } {
    // Bind this flow to the environment that is active right now. If the user
    // switches environments before the browser redirect completes, the token is
    // still stored under the environment they authenticated against.
    const sessionKey = getActiveSessionKey();
    if (!sessionKey) {
      throw new Error(
        "No IFS environment selected. Add one with add_ifs_environment, then choose it with use_ifs_environment."
      );
    }

    const state = crypto.randomBytes(16).toString("hex");
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    this.pendingAuths.set(state, { codeVerifier, state, sessionKey });
    // Auto-expire incomplete auth flows
    setTimeout(() => this.pendingAuths.delete(state), PENDING_AUTH_TTL_MS);

    const params = new URLSearchParams({
      client_id: OAUTH_CONFIG.clientId,
      redirect_uri: OAUTH_CONFIG.redirectUri,
      response_type: "code",
      scope: OAUTH_CONFIG.scope,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `${OAUTH_CONFIG.authorizationUrl}?${params.toString()}`;

    return { authUrl, state };
  }

  // Exchange authorization code for tokens
  async exchangeCode(code: string, state: string): Promise<string> {
    const pending = this.pendingAuths.get(state);
    if (!pending) {
      throw new Error("Invalid state parameter");
    }

    this.pendingAuths.delete(state);

    // Resolve token endpoint + client id from the environment this flow was
    // bound to (not the currently-active one).
    const { clientId, tokenUrl } = getOAuthParamsForKey(pending.sessionKey);

    const response = await axios.post(
      tokenUrl,
      {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        client_id: clientId,
        code_verifier: pending.codeVerifier,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Token is keyed by environment so each environment stays independently
    // authenticated.
    const sessionData: TokenData = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
      userId: pending.sessionKey,
    };

    tokenStore.set(pending.sessionKey, sessionData);

    return pending.sessionKey;
  }

  // Refresh access token
  async refreshAccessToken(sessionId: string): Promise<void> {
    const session = tokenStore.get(sessionId);
    if (!session?.refreshToken) {
      throw new Error("No refresh token available");
    }

    const { clientId, tokenUrl } = getOAuthParamsForKey(sessionId);
    const response = await axios.post(
      tokenUrl,
      {
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
        client_id: clientId,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    const updated: TokenData = {
      accessToken: access_token,
      refreshToken: refresh_token || session.refreshToken,
      expiresAt: Date.now() + expires_in * 1000,
      userId: session.userId,
    };

    tokenStore.set(sessionId, updated);
    // Persist refreshed token so it survives process restarts
    saveSession(sessionId, updated);
  }

  // Acquire (or renew) a token via the client credentials grant. Machine-to-
  // machine: no browser, no callback. Used by environments with
  // authMode === "client_credentials". Client-credentials responses carry no
  // refresh token, so renewal just re-requests.
  async clientCredentialsToken(sessionKey: string): Promise<void> {
    const { clientId, clientSecret, tokenUrl } = getOAuthParamsForKey(sessionKey);
    if (!clientSecret) {
      throw new Error(
        `Environment '${sessionKey}' uses client_credentials but has no client secret. Re-add it with add_ifs_environment including clientSecret.`
      );
    }

    const response = await axios.post(
      tokenUrl,
      {
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      },
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token, expires_in } = response.data;
    const data: TokenData = {
      accessToken: access_token,
      expiresAt: Date.now() + expires_in * 1000,
      userId: sessionKey,
    };

    tokenStore.set(sessionKey, data);
    saveSession(sessionKey, data);
  }

  // Get valid access token (refresh / re-acquire if needed)
  async getAccessToken(sessionId: string): Promise<string> {
    const { authMode } = getOAuthParamsForKey(sessionId);
    let session = tokenStore.get(sessionId);

    if (!session) {
      // client_credentials can authenticate on demand — no prior login needed.
      if (authMode === "client_credentials") {
        await this.clientCredentialsToken(sessionId);
        return tokenStore.get(sessionId)!.accessToken;
      }
      throw new Error("No session found. Please authenticate first.");
    }

    // Renew if expired or about to expire (5 min buffer).
    if (session.expiresAt < Date.now() + 300000) {
      if (authMode === "client_credentials") {
        await this.clientCredentialsToken(sessionId);
      } else {
        await this.refreshAccessToken(sessionId);
      }
      return tokenStore.get(sessionId)!.accessToken;
    }

    return session.accessToken;
  }
}
