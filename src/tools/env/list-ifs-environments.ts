import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { listEnvironments, authModeOf } from "../../lib/config.js";
import { loadSessions } from "../../lib/auth/session-manager.js";

export const definition: Tool = {
  name: "list_ifs_environments",
  description:
    "List all configured IFS Cloud environments, showing which one is active and whether each is currently authenticated. " +
    "Use this to show the user their options before they choose an environment to work with.",
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

export async function handler() {
  const config = listEnvironments();
  const sessions = loadSessions();
  const now = Date.now();

  const environments = Object.entries(config.environments).map(([name, env]) => {
    const session = sessions.get(name);
    let authStatus = "not_authenticated";
    if (session) {
      authStatus = session.expiresAt > now ? "authenticated" : "expired";
    }
    return {
      name,
      apiBaseUrl: env.apiBaseUrl,
      oauthRealm: env.oauthRealm,
      authMode: authModeOf(env),
      readOnly: !!env.readOnly,
      active: config.activeEnv === name,
      authStatus,
    };
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          activeEnvironment: config.activeEnv,
          environments,
          ...(environments.length === 0
            ? { hint: "No environments configured. Use add_ifs_environment to add one." }
            : {}),
        }, null, 2),
      },
    ],
  };
}
