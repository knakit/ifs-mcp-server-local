import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { OAuthManager } from "../../lib/auth/oauth-manager.js";
import { callProtectedApi } from "../../lib/api-client.js";

export const definition: Tool = {
  name: "call_protected_api",
  description: "Call a protected API endpoint using OAuth token. If no sessionId is provided, uses the most recent saved session.",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: {
        type: "string",
        description: "Session ID from OAuth authentication (optional - uses saved session if not provided)",
      },
      endpoint: {
        type: "string",
        description: "API endpoint to call (relative path)",
      },
      method: {
        type: "string",
        description: "HTTP method (GET, POST, etc.)",
        enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      },
      body: {
        type: "object",
        description: "Request body (for POST/PUT/PATCH)",
      },
    },
    required: ["endpoint", "method"],
  },
};

export async function handler(args: any, oauthManager: OAuthManager) {
  const { sessionId, endpoint, method, body } = args;

  const result = await callProtectedApi(
    { endpoint, method, sessionId, body },
    oauthManager
  );

  if (!result.success) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: result.error,
            status: result.status,
            message: result.message,
            details: result.details,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          status: result.status,
          data: result.data,
        }, null, 2),
      },
    ],
  };
}
