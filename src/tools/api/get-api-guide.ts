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
              "Do not attempt to discover or guess IFS endpoints. " +
              "Tell the user exactly this: " +
              "'I don't have a skill for that workflow yet. To create one: " +
              "(1) Perform this action in IFS Cloud in your browser as you normally would. " +
              "(2) Open DevTools (F12), go to the Network tab, right-click any request and choose \"Save all as HAR with content\". " +
              "(3) Use the build_ifs_skill_guide prompt with the HAR file path — I'll walk you through turning it into a skill.' " +
              "Do not proceed with any API calls until a guide exists.",
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
