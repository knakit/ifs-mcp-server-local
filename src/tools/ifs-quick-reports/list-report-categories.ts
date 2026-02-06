import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { OAuthManager } from "../../lib/auth/oauth-manager.js";
import { callProtectedApi } from "../../lib/api-client.js";

export const definition: Tool = {
  name: "list_report_categories",
  description: "List all IFS Quick Report categories. Categories are used to organize and group reports by functional area or business domain.",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: "OData filter expression (e.g., \"contains(Description, 'Sales')\")",
      },
      orderby: {
        type: "string",
        description: "OData orderby expression (e.g., \"CategoryId asc\")",
      },
      select: {
        type: "string",
        description: "Comma-separated list of fields to return (e.g., \"CategoryId,Description\")",
      },
      top: {
        type: "number",
        description: "Maximum number of results to return",
      },
      skip: {
        type: "number",
        description: "Number of results to skip",
      },
      sessionId: {
        type: "string",
        description: "Session ID from OAuth authentication (optional - uses saved session if not provided)",
      },
    },
  },
};

export async function handler(args: any, oauthManager: OAuthManager) {
  const {
    filter,
    orderby,
    select,
    top,
    skip,
    sessionId
  } = args || {};

  // Build query parameters manually to avoid URLSearchParams encoding OData keys like $filter → %24filter
  const queryParts: string[] = [];
  if (filter) queryParts.push(`$filter=${encodeURIComponent(filter)}`);
  if (orderby) queryParts.push(`$orderby=${encodeURIComponent(orderby)}`);
  if (select) queryParts.push(`$select=${encodeURIComponent(select)}`);
  if (top) queryParts.push(`$top=${top}`);
  if (skip) queryParts.push(`$skip=${skip}`);

  const queryString = queryParts.join('&');
  const endpoint = `/main/ifsapplications/projection/v1/QuickReportHandling.svc/ReportCategorySet${queryString ? '?' + queryString : ''}`;

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
            error: "Failed to list report categories",
            status: result.status,
            message: result.message,
            details: result.details,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }

  const categories = result.data?.value || [];

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          count: categories.length,
          categories: categories,
          query: {
            filter,
            orderby,
            select,
            top,
            skip
          }
        }, null, 2),
      },
    ],
  };
}
