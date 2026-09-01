import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { addEnvironment } from "../../lib/config.js";

export const definition: Tool = {
  name: "add_ifs_environment",
  description:
    "Register (or update) a named IFS Cloud environment with its URL, OAuth realm, and client ID. " +
    "The first environment added becomes the active one automatically. " +
    "Use this during setup when no environment is configured yet, or to add another instance (e.g. test, dev). " +
    "Auth mode defaults to interactive browser login (authorization_code). Set authMode to 'client_credentials' for headless/service-account auth (works in environments without a browser, e.g. Claude Cowork) — this requires a confidential client and clientSecret, and all calls run as the integration user rather than the end user.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Short name for this environment, e.g. 'prod', 'test', 'dev'.",
      },
      apiBaseUrl: {
        type: "string",
        description: "Base URL of the IFS Cloud instance, e.g. https://your-tenant.ifs.cloud",
      },
      oauthRealm: {
        type: "string",
        description: "The IFS OAuth realm name.",
      },
      oauthClientId: {
        type: "string",
        description: "The IFS OAuth 2.0 client ID. A public client for authorization_code, or a confidential client for client_credentials.",
      },
      authMode: {
        type: "string",
        enum: ["authorization_code", "client_credentials"],
        description: "Authentication mode. 'authorization_code' (default) = interactive browser login as the end user. 'client_credentials' = headless service-account login (no browser); requires clientSecret.",
      },
      clientSecret: {
        type: "string",
        description: "Confidential client secret. Required when authMode is 'client_credentials'. Stored in ~/.ifs-mcp/config.json — treat as sensitive.",
      },
      readOnly: {
        type: "boolean",
        description: "Optional. When true, call_protected_api blocks non-GET methods for this environment (recommended for production).",
      },
    },
    required: ["name", "apiBaseUrl", "oauthRealm", "oauthClientId"],
  },
};

export async function handler(args: any) {
  const { name, apiBaseUrl, oauthRealm, oauthClientId, authMode, clientSecret, readOnly } = args || {};
  if (!name || !apiBaseUrl || !oauthRealm || !oauthClientId) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: "name, apiBaseUrl, oauthRealm and oauthClientId are all required." }, null, 2) }],
      isError: true,
    };
  }

  if (authMode && authMode !== "authorization_code" && authMode !== "client_credentials") {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: "authMode must be 'authorization_code' or 'client_credentials'." }, null, 2) }],
      isError: true,
    };
  }

  if (authMode === "client_credentials" && !clientSecret) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: "clientSecret is required when authMode is 'client_credentials'." }, null, 2) }],
      isError: true,
    };
  }

  const config = addEnvironment(name, { apiBaseUrl, oauthRealm, oauthClientId, authMode, clientSecret, readOnly: !!readOnly });
  const isClientCreds = authMode === "client_credentials";
  const isActive = config.activeEnv === name;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          message: `Environment '${name}' saved.`,
          authMode: isClientCreds ? "client_credentials" : "authorization_code",
          activeEnvironment: config.activeEnv,
          hint: isActive
            ? (isClientCreds
                ? "This is now the active environment. It authenticates automatically (client credentials) on the first call — start_oauth is optional and will just pre-fetch a token."
                : "This is now the active environment. Call start_oauth to authenticate.")
            : `Run use_ifs_environment with '${name}' to switch to it${isClientCreds ? " (it authenticates automatically)." : ", then start_oauth."}`,
        }, null, 2),
      },
    ],
  };
}
