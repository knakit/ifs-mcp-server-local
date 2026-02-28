import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { parseHar, summariseHar } from "../../lib/har-parser.js";

export const definition: Tool = {
  name: "parse_har_file",
  description:
    "Read and summarise a browser HAR file for skill authoring. " +
    "Returns a structured summary of the IFS API calls found in the recording.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Absolute path to the .har file exported from browser DevTools.",
      },
    },
    required: ["path"],
  },
};

export async function handler(args: any) {
  const { path } = args;
  try {
    const parsed = parseHar(path);
    const summary = summariseHar(parsed);
    return {
      content: [{ type: "text" as const, text: summary }],
    };
  } catch (err: any) {
    return {
      content: [{ type: "text" as const, text: `Failed to parse HAR file: ${err.message}` }],
      isError: true,
    };
  }
}
