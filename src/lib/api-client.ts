import axios, { AxiosRequestConfig } from "axios";
import { OAuthManager } from "./auth/oauth-manager.js";
import { getCurrentSessionId } from "./auth/session-manager.js";
import { getApiBaseUrlForKey } from "./types.js";
import { getEnvironment } from "./config.js";

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

/**
 * Join the environment's base URL and a caller-supplied endpoint, or return null if the
 * result would not stay on the configured host. The endpoint comes from the model, so it
 * must never be able to change the host the bearer token is sent to: `base + "@evil.com/x"`
 * resolves to evil.com, and so does a protocol-relative `//evil.com`. An endpoint must be a
 * plain path starting with a single "/", and the final URL must keep the base URL's origin.
 */
export function buildApiUrl(base: string, endpoint: string): string | null {
  if (!base || typeof endpoint !== "string") return null;
  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(endpoint)) return null;
  try {
    if (new URL(base + endpoint).origin !== new URL(base).origin) return null;
  } catch {
    return null;
  }
  return base + endpoint;
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

  // Enforced here, on the environment this request is actually sent to, so no tool (and no
  // sessionId/environment argument) can reach a read-only environment with a write method.
  const targetEnv = getEnvironment(sessionId);
  if (targetEnv?.readOnly && String(method).toUpperCase() !== "GET") {
    return {
      success: false,
      error: "read_only_environment",
      message: `Environment '${sessionId}' is marked read-only; ${method} is blocked. Only GET requests are allowed.`,
    };
  }

  const url = buildApiUrl(getApiBaseUrlForKey(sessionId), endpoint);
  if (!url) {
    return {
      success: false,
      error: "invalid_endpoint",
      message: "The endpoint must be a path on your IFS Cloud instance that starts with a single '/' (for example /main/ifsapplications/projection/v1/...). Full URLs and other hosts are not allowed.",
    };
  }

  try {
    const accessToken = await oauthManager.getAccessToken(sessionId);

    const config: AxiosRequestConfig = {
      method,
      // Base URL comes from the same environment as the token (sessionId == env
      // key), so an explicit per-call environment override stays consistent.
      url,
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
