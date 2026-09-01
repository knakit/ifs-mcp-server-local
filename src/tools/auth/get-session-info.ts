import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getCurrentSessionId } from "../../lib/auth/session-manager.js";
import { tokenStore } from "../../lib/auth/token-store.js";
import { getActiveEnvName } from "../../lib/config.js";

export const definition: Tool = {
  name: "get_session_info",
  description: "Get information about the current saved session for the active IFS environment, including which environment is active and expiration status.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export async function handler(args: unknown, oauthManager?: any) {
  const activeEnv = getActiveEnvName();
  const sessionId = getCurrentSessionId();

  if (!sessionId) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            authenticated: false,
            activeEnvironment: activeEnv,
            message: activeEnv
              ? "No active session found for the selected environment. Please use start_oauth to authenticate."
              : "No IFS environment selected. Use list_ifs_environments and use_ifs_environment first.",
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
          activeEnvironment: activeEnv,
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
