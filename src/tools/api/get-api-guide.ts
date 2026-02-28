import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getResources } from "../../resources/index.js";

export const definition: Tool = {
  name: "get_api_guide",
  description: "Get the API guide for a specific IFS projection. Call this before using call_protected_api to learn the correct endpoints, OData syntax, and query patterns. Call without arguments to list all available guides.",
  inputSchema: {
    type: "object",
    properties: {
      guide: {
        type: "string",
        description:
          "The guide to retrieve — matched against URI, name, and description (case-insensitive). Use a keyword like 'parts', 'sales', or 'customer'. Lists all available guides if omitted.",
      },
    },
  },
};

export async function handler(args: any) {
  const { guide } = args || {};
  const resources = getResources();

  if (!guide) {
    const available = resources.map((r) => ({
      name: r.definition.name,
      uri: r.definition.uri,
      description: r.definition.description,
    }));
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ available_guides: available }, null, 2),
        },
      ],
    };
  }

  const needle = guide.toLowerCase();
  const resource = resources.find((r) =>
    r.definition.uri.toLowerCase().includes(needle) ||
    r.definition.name?.toLowerCase().includes(needle) ||
    r.definition.description?.toLowerCase().includes(needle)
  );

  if (!resource) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: `No guide found for '${guide}'.`,
            available_guides: resources.map((r) => r.definition.uri),
            instruction:
              "No existing skill guide was found for that projection. " +
              "If the user wants to BUILD a new skill for this projection, use the build_ifs_skill_from_projection prompt (pass the projection name) — it will fetch the live OpenAPI spec and guide you through authoring the skill. " +
              "If the user just wants to USE an existing skill that doesn't exist yet, tell the user: " +
              "'I don't have a skill for that workflow yet. You can create one using the build_ifs_skill_from_projection prompt, or by recording a HAR file from the browser and using build_ifs_skill_from_har.' " +
              "Do not attempt to guess or discover IFS endpoints without a guide or skill-building session.",
          }, null, 2),
        },
      ],
      isError: true,
    };
  }

  const result = await resource.handler(resource.definition.uri);
  const text = result.contents[0]?.text || "Guide content not available";

  return {
    content: [
      {
        type: "text" as const,
        text: text as string,
      },
    ],
  };
}
