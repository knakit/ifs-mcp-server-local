import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { OAuthManager } from "../../lib/auth/oauth-manager.js";
import { callProtectedApi } from "../../lib/api-client.js";

export const definition: Tool = {
  name: "call_protected_api",
  description:
    "Call a protected IFS Cloud API endpoint using an authenticated session. " +
    "IMPORTANT: Only call endpoints that you have learned from a guide via get_api_guide. " +
    "Do NOT attempt to discover, guess, or construct IFS endpoints from scratch — do not call $metadata or probe unknown paths. " +
    "If the user asks for something and you do not have a guide that covers it, stop and tell them: " +
    "'I don't have a skill for that workflow yet. Please perform this action in IFS Cloud in your browser, " +
    "then export a HAR file from DevTools (Network tab → right-click → Save all as HAR with content) " +
    "and use the build_ifs_guide prompt to create a skill for it.' " +
    "If no sessionId is provided, uses the most recent saved session.",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: {
        type: "string",
        description: "Session ID from OAuth authentication (optional - uses saved session if not provided)",
      },
      endpoint: {
        type: "string",
        description: "API endpoint to call (relative path)",
      },
      method: {
        type: "string",
        description: "HTTP method (GET, POST, etc.)",
        enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      },
      body: {
        type: "object",
        description: "Request body (for POST/PUT/PATCH)",
      },
    },
    required: ["endpoint", "method"],
  },
};

const MAX_RESPONSE_SIZE = 100 * 1024; // 100KB

function buildLargeResponseSummary(data: any, endpoint: string) {
  const records = data?.value;
  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }

  const totalRecords = records.length;
  const sampleRecord = records[0];
  const fields = Object.keys(sampleRecord);

  return {
    _instruction: `The query returned ${totalRecords} records which is too large to display. Present the options below to the user in a friendly, conversational way. Don't list them robotically — weave them into a natural response. Mention the record count and a couple of interesting fields from the sample record to give context.`,
    total_records: totalRecords,
    available_fields: fields,
    sample_record: sampleRecord,
    options: {
      preview: `Show a preview: re-run with $top=N (e.g., $top=10) to see the first few records.`,
      filter: `Narrow it down: add $filter on fields like ${fields.slice(0, 3).join(", ")} to find specific records.`,
      select_fields: `Slim the columns: use $select to return only the fields they care about (e.g., $select=${fields.slice(0, 3).join(",")}).`,
      export: `Save it all: use export_api_data to download all ${totalRecords} records as a CSV file to their Downloads folder.`,
    },
    endpoint_used: endpoint,
  };
}

export async function handler(args: any, oauthManager: OAuthManager) {
  const { sessionId, endpoint, method, body } = args;

  const result = await callProtectedApi(
    { endpoint, method, sessionId, body },
    oauthManager
  );

  if (!result.success) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: result.error,
            status: result.status,
            message: result.message,
            details: result.details,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }

  const responseJson = JSON.stringify({ status: result.status, data: result.data }, null, 2);

  if (responseJson.length > MAX_RESPONSE_SIZE) {
    const summary = buildLargeResponseSummary(result.data, endpoint);
    if (summary) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: responseJson,
      },
    ],
  };
}
