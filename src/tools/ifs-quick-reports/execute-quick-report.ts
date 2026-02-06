import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { OAuthManager } from "../../lib/auth/oauth-manager.js";
import { callProtectedApi } from "../../lib/api-client.js";

export const definition: Tool = {
  name: "execute_quick_report",
  description: "Execute an IFS Quick Report and get the results. QuickReportId must have a value to run this. If a unique reportId cannot be found, run the search-quick-reports by refining user input until a unique value is found. Instructions for execution: run a count first and get the record count. if the records exceeds 10, get the user confirmation before execution",
  inputSchema: {
    type: "object",
    properties: {
      QuickReportId: {
        type: "string",
        description: "The Quick Report ID (e.g., 123456)",
      },
      parameters: {
        type: "object",
        description: "Report parameters as key-value pairs (e.g., {\"CustomerNo\": \"1001\", \"DateFrom\": \"2024-01-01\"}). Use get_report_parameters to learn what parameters are required.",
      },
      sessionId: {
        type: "string",
        description: "Session ID from OAuth authentication (optional - uses saved session if not provided)",
      },
    },
    required: ["QuickReportId"],
  },
};

export async function handler(args: any, oauthManager: OAuthManager) {
  const { QuickReportId, parameters, sessionId } = args;

  // Build OData function parameters (inside parentheses)
  let paramString = '';
  if (parameters && typeof parameters === 'object' && Object.keys(parameters).length > 0) {
    const paramPairs = Object.entries(parameters).map(([key, value]) => {
      // Wrap string values in single quotes for OData
      const formattedValue = typeof value === 'string' ? `'${value}'` : value;
      return `${key}=${formattedValue}`;
    });
    paramString = paramPairs.join(',');
  }

  const endpoint = `/main/ifsapplications/projection/v1/QuickReports.svc/QuickReport_${QuickReportId}(${paramString})`;

  const result = await callProtectedApi(
    { endpoint, method: "GET", sessionId },
    oauthManager
  );

  if (!result.success) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: "Failed to execute quick report",
            QuickReportId: QuickReportId,
            parameters: parameters,
            status: result.status,
            message: result.message,
            details: result.details,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          QuickReportId: QuickReportId,
          parameters: parameters,
          data: result.data,
        }, null, 2),
      },
    ],
  };
}
