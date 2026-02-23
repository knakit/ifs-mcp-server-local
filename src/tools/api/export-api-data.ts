import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { OAuthManager } from "../../lib/auth/oauth-manager.js";
import { callProtectedApi } from "../../lib/api-client.js";
import fs from "fs";
import path from "path";
import os from "os";

export const definition: Tool = {
  name: "export_api_data",
  description:
    "Export large API result sets to a CSV file. Fetches data in batches of 100 records using $top/$skip pagination and saves to ~/.ifs-mcp/exports/. Use this when call_protected_api returns a 'Response too large' warning.",
  inputSchema: {
    type: "object",
    properties: {
      endpoint: {
        type: "string",
        description: "API endpoint to call (same as used with call_protected_api)",
      },
      method: {
        type: "string",
        description: "HTTP method",
        enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      },
      filename: {
        type: "string",
        description: "Output filename without extension (e.g., 'quick-reports'). Defaults to 'export'.",
      },
      sessionId: {
        type: "string",
        description: "Session ID (optional - uses saved session if not provided)",
      },
      body: {
        type: "object",
        description: "Request body (for POST/PUT/PATCH)",
      },
    },
    required: ["endpoint", "method"],
  },
};

const BATCH_SIZE = 100;

const DELIMITER = ";";

function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(DELIMITER) || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(records: any[]): string {
  if (records.length === 0) return "";
  const headers = Object.keys(records[0]);
  const lines = [headers.map(escapeCsvValue).join(DELIMITER)];
  for (const record of records) {
    lines.push(headers.map((h) => escapeCsvValue(record[h])).join(DELIMITER));
  }
  return lines.join("\n");
}

function stripPaginationParams(endpoint: string): string {
  const qIdx = endpoint.indexOf("?");
  if (qIdx === -1) return endpoint;
  const params = new URLSearchParams(endpoint.substring(qIdx + 1));
  params.delete("$top");
  params.delete("$skip");
  const remaining = params.toString();
  return remaining ? `${endpoint.substring(0, qIdx)}?${remaining}` : endpoint.substring(0, qIdx);
}

function appendEndpointParam(endpoint: string, param: string): string {
  return endpoint.includes("?") ? `${endpoint}&${param}` : `${endpoint}?${param}`;
}

export async function handler(args: any, oauthManager: OAuthManager) {
  const { endpoint, method, filename = "export", sessionId, body } = args;

  const downloadsDir = path.join(os.homedir(), "Downloads");
  const exportDir = fs.existsSync(downloadsDir) ? downloadsDir : path.join(os.homedir(), ".ifs-mcp", "exports");
  fs.mkdirSync(exportDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outputPath = path.join(exportDir, `${filename}_${timestamp}.csv`);

  const baseEndpoint = stripPaginationParams(endpoint);
  let allRecords: any[] = [];
  let skip = 0;
  let batchCount = 0;

  try {
    while (true) {
      let batchEndpoint = appendEndpointParam(baseEndpoint, `$top=${BATCH_SIZE}&$skip=${skip}`);

      const result = await callProtectedApi(
        { endpoint: batchEndpoint, method, sessionId, body },
        oauthManager
      );

      if (!result.success) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "API call failed during export",
                batch: batchCount + 1,
                records_exported_so_far: allRecords.length,
                details: result.message || result.error,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const records = result.data?.value;
      if (!Array.isArray(records) || records.length === 0) {
        break;
      }

      allRecords.push(...records);
      batchCount++;
      skip += BATCH_SIZE;

      // If we got fewer than BATCH_SIZE, we've reached the end
      if (records.length < BATCH_SIZE) {
        break;
      }
    }

    if (allRecords.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "No records found to export." }, null, 2),
          },
        ],
      };
    }

    const csv = buildCsv(allRecords);
    const BOM = "\uFEFF";
    fs.writeFileSync(outputPath, BOM + csv, "utf-8");

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            total_records: allRecords.length,
            batches_fetched: batchCount,
            file: outputPath,
            fields: Object.keys(allRecords[0]),
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: "Export failed",
            message: error.message,
            records_exported_so_far: allRecords.length,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
