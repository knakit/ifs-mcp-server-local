import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { parseOpenApi, summariseOpenApi } from "../../lib/openapi-parser.js";

export const definition: Tool = {
  name: "read_openapi_file",
  description:
    "Read and summarise a downloaded OpenAPI/Swagger JSON file for skill authoring. " +
    "Returns a structured summary of the entity sets, methods, and properties found in the spec.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Absolute path to the downloaded OpenAPI/Swagger JSON file.",
      },
    },
    required: ["path"],
  },
};

export async function handler(args: any) {
  const { path } = args;
  try {
    const parsed = parseOpenApi(path);
    const summary = summariseOpenApi(parsed);
    return {
      content: [{ type: "text" as const, text: summary }],
    };
  } catch (err: any) {
    return {
      content: [{ type: "text" as const, text: `Failed to read OpenAPI file: ${err.message}` }],
      isError: true,
    };
  }
}
