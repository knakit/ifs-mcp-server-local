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
      error: "No session found",
      message: "Please authenticate first using the start_oauth tool",
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
      return {
        success: false,
        status: error.response?.status,
        error: "API call failed",
        message: error.response?.data || error.message,
        details: error.response?.data?.error || null,
      };
    }
    throw error;
  }
}
