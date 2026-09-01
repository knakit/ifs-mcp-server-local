import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { removeEnvironment } from "../../lib/config.js";
import { removeSession } from "../../lib/auth/session-manager.js";

export const definition: Tool = {
  name: "remove_ifs_environment",
  description:
    "Delete a configured IFS Cloud environment and its saved authentication token. " +
    "If the removed environment was active and only one other remains, that one becomes active; otherwise no environment is active.",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the environment to remove.",
      },
    },
    required: ["name"],
  },
};

export async function handler(args: any) {
  const { name } = args || {};
  if (!name) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: "name is required." }, null, 2) }],
      isError: true,
    };
  }

  const config = removeEnvironment(name);
  removeSession(name);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          message: `Environment '${name}' removed.`,
          activeEnvironment: config.activeEnv,
          remaining: Object.keys(config.environments),
        }, null, 2),
      },
    ],
  };
}
