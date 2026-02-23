import crypto from "crypto";
import axios from "axios";
import { OAUTH_CONFIG, TokenData } from "../types.js";
import { tokenStore } from "./token-store.js";
import { saveSession } from "./session-manager.js";

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
  }>();

  // Start OAuth flow
  startAuthFlow(): { authUrl: string; state: string } {
    const state = crypto.randomBytes(16).toString("hex");
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    this.pendingAuths.set(state, { codeVerifier, state });
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

    const response = await axios.post(
      OAUTH_CONFIG.tokenUrl,
      {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        client_id: OAUTH_CONFIG.clientId,
        code_verifier: pending.codeVerifier,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Generate session ID
    const sessionId = crypto.randomBytes(16).toString("hex");

    // Store tokens
    const sessionData: TokenData = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
      userId: sessionId, // In production, extract from token or user info endpoint
    };

    tokenStore.set(sessionId, sessionData);

    return sessionId;
  }

  // Refresh access token
  async refreshAccessToken(sessionId: string): Promise<void> {
    const session = tokenStore.get(sessionId);
    if (!session?.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await axios.post(
      OAUTH_CONFIG.tokenUrl,
      {
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
        client_id: OAUTH_CONFIG.clientId,
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

  // Get valid access token (refresh if needed)
  async getAccessToken(sessionId: string): Promise<string> {
    const session = tokenStore.get(sessionId);
    if (!session) {
      throw new Error("No session found. Please authenticate first.");
    }

    // Check if token is expired or about to expire (5 min buffer)
    if (session.expiresAt < Date.now() + 300000) {
      await this.refreshAccessToken(sessionId);
      return tokenStore.get(sessionId)!.accessToken;
    }

    return session.accessToken;
  }
}
