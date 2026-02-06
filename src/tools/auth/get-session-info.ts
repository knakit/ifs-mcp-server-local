import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentSessionId } from "../../lib/auth/session-manager.js";
import { tokenStore } from "../../lib/auth/token-store.js";

export const definition: Tool = {
  name: "get_session_info",
  description: "Get information about the current saved session, including session ID and expiration status.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export async function handler(args: unknown, oauthManager?: any) {
  const sessionId = getCurrentSessionId();

  if (!sessionId) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            authenticated: false,
            message: "No active session found. Please use start_oauth to authenticate.",
          }, null, 2),
        },
      ],
    };
  }

  const sessionData = tokenStore.get(sessionId);

  if (!sessionData) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            authenticated: false,
            message: "Session ID found but session data is missing. Please re-authenticate.",
          }, null, 2),
        },
      ],
    };
  }

  const now = Date.now();
  const isExpired = sessionData.expiresAt < now;
  const expiresIn = Math.floor((sessionData.expiresAt - now) / 1000); // seconds
  const hasRefreshToken = !!sessionData.refreshToken;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          authenticated: true,
          sessionId: sessionId,
          expiresIn: isExpired ? 0 : expiresIn,
          expiresInMinutes: isExpired ? 0 : Math.floor(expiresIn / 60),
          isExpired: isExpired,
          canRefresh: hasRefreshToken,
          userId: sessionData.userId,
          message: isExpired
            ? "Session expired but can be refreshed automatically on next API call"
            : `Session active and valid for ${Math.floor(expiresIn / 60)} more minutes`,
        }, null, 2),
      },
    ],
  };
}
