import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { addEnvironment, clientSecretEnvVar, clientSecretSource, getConfigDiagnostics } from "../../lib/config.js";

export const definition: Tool = {
  name: "add_ifs_environment",
  description:
    "Register (or update) a named IFS Cloud environment with its URL, OAuth realm, and client ID. " +
    "The first environment added becomes the active one automatically. " +
    "Use this during setup when no environment is configured yet, or to add another instance (e.g. test, dev). " +
    "Auth mode defaults to interactive browser login (authorization_code). Set authMode to 'client_credentials' for headless/service-account auth (works without a browser) — this needs a confidential client, and all calls run as the integration user rather than the end user. " +
    "NEVER ask the user for a client secret and never accept one in chat: this tool takes no secret. For client_credentials the user supplies it themselves, outside the conversation — via the IFS_CLIENT_SECRET_<NAME> environment variable, or by editing config.json (the response says exactly how). If the user pastes a secret into chat anyway, do not use or repeat it; tell them to rotate it in IFS IAM.",
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
        description: "The IFS OAuth 2.0 client ID. A public client for authorization_code, or a confidential client for client_credentials (max 20 characters in IFS).",
      },
      authMode: {
        type: "string",
        enum: ["authorization_code", "client_credentials"],
        description: "Authentication mode. 'authorization_code' (default) = interactive browser login as the end user. 'client_credentials' = headless service-account login (no browser); the secret is supplied by the user outside chat.",
      },
      readOnly: {
        type: "boolean",
        description: "Optional. When true, every API tool (call_protected_api and export_api_data) blocks non-GET methods for this environment (recommended for production). When updating an existing environment, omit it to keep the current setting; pass false only if the user asked to allow writes.",
      },
    },
    required: ["name", "apiBaseUrl", "oauthRealm", "oauthClientId"],
  },
};

// Argument names that would carry a secret. Matched case-insensitively, ignoring _ and -.
const SECRET_ARG_NAMES = new Set(["clientsecret", "secret", "password", "apikey"]);

function findSecretArg(args: any): string | null {
  for (const key of Object.keys(args || {})) {
    if (SECRET_ARG_NAMES.has(key.toLowerCase().replace(/[_-]/g, ""))) return key;
  }
  return null;
}

function error(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

export async function handler(args: any) {
  // Refuse before touching anything else. The value is never read or echoed.
  if (findSecretArg(args)) {
    return error(
      "This tool does not accept a client secret, and secrets must not be sent through chat. " +
      "Nothing was saved. Register the environment without it; the response will explain how to add the secret yourself " +
      "(environment variable or config.json). If you already pasted a secret into a chat, rotate it in IFS IAM."
    );
  }

  const { name, apiBaseUrl, oauthRealm, oauthClientId, authMode, readOnly } = args || {};
  if (!name || !apiBaseUrl || !oauthRealm || !oauthClientId) {
    return error("name, apiBaseUrl, oauthRealm and oauthClientId are all required.");
  }

  if (authMode && authMode !== "authorization_code" && authMode !== "client_credentials") {
    return error("authMode must be 'authorization_code' or 'client_credentials'.");
  }

  const config = addEnvironment(name, { apiBaseUrl, oauthRealm, oauthClientId, authMode, readOnly: typeof readOnly === "boolean" ? readOnly : undefined });
  const isClientCreds = authMode === "client_credentials";
  const isActive = config.activeEnv === name;

  // client_credentials: report where the secret comes from (never its value) and,
  // if it isn't set yet, exactly how the user adds it themselves.
  let secret: Record<string, unknown> | undefined;
  if (isClientCreds) {
    const source = clientSecretSource(name);
    const envVar = clientSecretEnvVar(name);
    const configFile = getConfigDiagnostics().configFile;
    secret = source === "missing"
      ? {
          status: "missing",
          action_required:
            "Ask the user to add the client secret themselves — do NOT ask them to paste it here. " +
            `Option 1: set the ${envVar} environment variable before the host starts. ` +
            `Option 2: open ${configFile} and add "clientSecret": "<secret>" inside environments.${name}. ` +
            "Changes to config.json take effect on the next call; no restart needed. " +
            "Then call start_oauth to confirm.",
          envVar,
          configFile,
          configSnippet: { environments: { [name]: { clientSecret: "<paste the secret here yourself — not in chat>" } } },
        }
      : { status: "configured", source };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          message: `Environment '${name}' saved.`,
          authMode: isClientCreds ? "client_credentials" : "authorization_code",
          activeEnvironment: config.activeEnv,
          ...(secret ? { clientSecret: secret } : {}),
          hint: isActive
            ? (isClientCreds
                ? "This is now the active environment. Once the client secret is configured (see clientSecret above) it authenticates automatically on the first call — start_oauth is optional and will just pre-fetch a token."
                : "This is now the active environment. Call start_oauth to authenticate.")
            : `Run use_ifs_environment with '${name}' to switch to it${isClientCreds ? " (it authenticates automatically once its secret is configured)." : ", then start_oauth."}`,
        }, null, 2),
      },
    ],
  };
}
