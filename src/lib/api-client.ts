import axios, { AxiosRequestConfig } from "axios";
import { OAuthManager } from "./auth/oauth-manager.js";
import { getCurrentSessionId } from "./auth/session-manager.js";
import { getApiBaseUrlForKey } from "./types.js";

export interface ApiCallOptions {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  sessionId?: string;
  body?: any;
  headers?: Record<string, string>;
}

// Only headers with a legitimate, narrow purpose are allowed through from
// tool input: OData optimistic concurrency (If-Match/If-None-Match), and
// IFS's own custom header for naming a file on upload/download responses.
// Anything else (Authorization, Host, proxy headers, etc.) is rejected
// before it ever reaches this client.
export const ALLOWED_REQUEST_HEADERS = new Set([
  "if-match",
  "if-none-match",
  "x-ifs-content-disposition",
]);

/** Returns the caller-supplied header names that aren't allowed, or [] if all are fine. */
export function disallowedHeaders(headers?: Record<string, string>): string[] {
  if (!headers) return [];
  return Object.keys(headers).filter((k) => !ALLOWED_REQUEST_HEADERS.has(k.toLowerCase()));
}

export interface ApiResponse {
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  message?: string;
  details?: any;
}

/**
 * Make an authenticated API call to IFS Cloud
 * Handles session management, token refresh, and error handling
 */
export async function callProtectedApi(
  options: ApiCallOptions,
  oauthManager: OAuthManager
): Promise<ApiResponse> {
  const { endpoint, method, sessionId: providedSessionId, body, headers = {} } = options;

  // Use provided sessionId or get the current saved session
  const sessionId = providedSessionId || getCurrentSessionId();

  if (!sessionId) {
    return {
      success: false,
      error: "authentication_required",
      message: "No active session. Call the start_oauth tool now to open the login window — do not ask the user to do this manually.",
    };
  }

  try {
    const accessToken = await oauthManager.getAccessToken(sessionId);

    const config: AxiosRequestConfig = {
      method,
      // Base URL comes from the same environment as the token (sessionId == env
      // key), so an explicit per-call environment override stays consistent.
      url: `${getApiBaseUrlForKey(sessionId)}${endpoint}`,
      headers: {
        // Caller headers spread first so they can never override the
        // server-controlled ones below, regardless of what's passed in —
        // the allowlist in tool handlers is the primary guard, this is
        // defense in depth.
        ...headers,
        Authorization: `Bearer ${accessToken}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    };

    if (body) {
      config.data = body;
    }

    const response = await axios(config);

    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        return {
          success: false,
          status,
          error: "authentication_required",
          message: "Session expired or unauthorised. Call the start_oauth tool now to re-authenticate — do not ask the user to do this manually.",
        };
      }
      return {
        success: false,
        status,
        error: "API call failed",
        message: error.response?.data || error.message,
        details: error.response?.data?.error || null,
      };
    }
    throw error;
  }
}
