import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { resources } from "../../resources/index.js";

export const definition: Tool = {
  name: "get_api_guide",
  description:
    "Get the API guide for a specific IFS projection. Call this before using call_protected_api to learn the correct endpoints, OData syntax, and query patterns. Available guides: 'quick-reports'.",
  inputSchema: {
    type: "object",
    properties: {
      guide: {
        type: "string",
        description:
          "The guide to retrieve (e.g., 'quick-reports'). Lists available guides if omitted.",
      },
    },
  },
};

export async function handler(args: any) {
  const { guide } = args || {};

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

  const resource = resources.find((r) =>
    r.definition.uri.includes(guide)
  );

  if (!resource) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: `Guide '${guide}' not found`,
            available: resources.map((r) => r.definition.uri),
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
