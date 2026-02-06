import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { OAuthManager } from "../../lib/auth/oauth-manager.js";
import { callProtectedApi } from "../../lib/api-client.js";

export const definition: Tool = {
  name: "get_report_parameters",
  description: "Get the required parameters for a specific IFS Quick Report. Use this after finding a report ID to learn what parameters are needed before executing it.",
  inputSchema: {
    type: "object",
    properties: {
      reportId: {
        type: "string",
        description: "The Quick Report ID (e.g., '12345' or 'CUSTOMER_ORDERS')",
      },
      sessionId: {
        type: "string",
        description: "Session ID from OAuth authentication (optional - uses saved session if not provided)",
      },
    },
    required: ["reportId"],
  },
};

export async function handler(args: any, oauthManager: OAuthManager) {
  const { reportId, sessionId } = args;

  const endpoint = `/main/ifsapplications/projection/v1/QuickReports.svc/GetParameters(ReportId='${reportId}')`;

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
            error: "Failed to get report parameters",
            reportId: reportId,
            status: result.status,
            message: result.message,
            details: result.details,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }

  const parameters = result.data?.value || [];

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          reportId: reportId,
          parameterCount: parameters.length,
          parameters: parameters,
        }, null, 2),
      },
    ],
  };
}
