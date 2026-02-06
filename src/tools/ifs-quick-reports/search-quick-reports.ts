import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { OAuthManager } from "../../lib/auth/oauth-manager.js";
import { callProtectedApi } from "../../lib/api-client.js";

export const definition: Tool = {
  name: "search_quick_reports",
  description: "Search for IFS Quick Reports by their human-readable description text. IMPORTANT: if the search is a non numeric, use the input quick report name as Description. Select ONLY QuickReportId,Description unless user specifically asked to fetch different columns",
  inputSchema: {
    type: "object",
    properties: {
      searchText: {
        type: "string",
        description: "Search text to find in report descriptions. The tool will automatically create a case-insensitive search filter. For example, 'session stats' will search for reports with descriptions starting with 'session stats'.",
      },
      filter: {
        type: "string",
        description: "Advanced OData filter expression for complex queries (optional). If searchText is provided, this will be ignored. Use IFS OData syntax with double parentheses: ((startswith(tolower(Description), 'text')))",
      },
      orderby: {
        type: "string",
        description: "OData orderby expression (e.g., \"QuickReportId asc\" or \"ModifiedDate desc\")",
      },
      select: {
        type: "string",
        description: "Comma-separated list of fields to return (e.g., \"QuickReportId,Description,CategoryId\")",
      },
      top: {
        type: "number",
        description: "Maximum number of results to return (for pagination)",
      },
      skip: {
        type: "number",
        description: "Number of results to skip (for pagination)",
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
    searchText,
    filter,
    orderby,
    select,
    top,
    skip,
    sessionId
  } = args || {};

  // Build the filter - prioritize searchText over manual filter
  let finalFilter = filter;
  if (searchText) {
    // Use IFS pattern: ((startswith(tolower(Description),'text')))
    // Note: No space after comma - IFS is strict about this
    const searchLower = searchText.toLowerCase();
    finalFilter = `((startswith(tolower(Description),'${searchLower}')))`;
  }

  // Build query parameters manually to avoid URLSearchParams encoding OData keys like $filter → %24filter
  const queryParts: string[] = [];
  if (finalFilter) queryParts.push(`$filter=${encodeURIComponent(finalFilter)}`);
  if (orderby) queryParts.push(`$orderby=${encodeURIComponent(orderby)}`);
  if (select) queryParts.push(`$select=${encodeURIComponent(select)}`);
  if (top) queryParts.push(`$top=${top}`);
  if (skip) queryParts.push(`$skip=${skip}`);

  const queryString = queryParts.join('&');
  const endpoint = `/main/ifsapplications/projection/v1/QuickReportHandling.svc/QuickReportSet${queryString ? '?' + queryString : ''}`;

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
            error: "Failed to search quick reports",
            status: result.status,
            message: result.message,
            details: result.details,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }

  const reports = result.data?.value || [];

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          count: reports.length,
          reports: reports,
          query: {
            searchText,
            filter: finalFilter,
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
