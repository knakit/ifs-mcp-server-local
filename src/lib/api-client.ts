import axios, { AxiosRequestConfig } from "axios";
import { OAuthManager } from "./auth/oauth-manager.js";
import { getCurrentSessionId } from "./auth/session-manager.js";
import { getApiBaseUrl } from "./types.js";

export interface ApiCallOptions {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  sessionId?: string;
  body?: any;
  headers?: Record<string, string>;
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
      url: `${getApiBaseUrl()}${endpoint}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...headers,
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
