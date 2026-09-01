import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { useEnvironment, listEnvironments, getEnvironment, authModeOf } from "../../lib/config.js";
import { loadSessions } from "../../lib/auth/session-manager.js";

export const definition: Tool = {
  name: "use_ifs_environment",
  description:
    "Select which IFS Cloud environment subsequent IFS calls target. The selection persists until changed. " +
    "Call this when the user says which environment to work with (e.g. 'use test', 'switch to prod').",
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
        description: "Name of the environment to activate (must already exist — see list_ifs_environments).",
      },
    },
    required: ["name"],
  },
};

export async function handler(args: any) {
  const { name } = args || {};
  try {
    useEnvironment(name);
  } catch (err) {
    const config = listEnvironments();
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        error: (err as Error).message,
        environments: Object.keys(config.environments),
      }, null, 2) }],
      isError: true,
    };
  }

  const sessions = loadSessions();
  const session = sessions.get(name);
  const authed = !!session && session.expiresAt > Date.now();
  const mode = authModeOf(getEnvironment(name));

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          activeEnvironment: name,
          authMode: mode,
          authenticated: authed,
          hint: authed
            ? "Already authenticated for this environment. You can make IFS calls now."
            : mode === "client_credentials"
              ? "This environment uses client credentials — it authenticates automatically on the first IFS call. No browser login needed."
              : "Not authenticated for this environment yet — call start_oauth.",
        }, null, 2),
      },
    ],
  };
}
