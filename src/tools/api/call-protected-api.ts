import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { OAuthManager } from "../../lib/auth/oauth-manager.js";
import { callProtectedApi, disallowedHeaders, ALLOWED_REQUEST_HEADERS } from "../../lib/api-client.js";
import { loadConfig, getEnvironment } from "../../lib/config.js";

export const definition: Tool = {
  name: "call_protected_api",
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    openWorldHint: true,
  },
  description:
    "Call a protected IFS Cloud API endpoint using an authenticated session. " +
    "IFS Cloud projection names, endpoint paths, key fields, and OData filter syntax are non-standard and vary per customer configuration. " +
    "Guessing them will produce 404 errors or silently return wrong data. " +
    "You MUST call get_api_guide first to get the correct endpoint and query pattern for the workflow — do not skip this step even if you think you know the endpoint. " +
    "Do NOT call $metadata, probe unknown paths, or construct endpoints from scratch. " +
    "If get_api_guide returns no matching guide, stop and tell the user: " +
    "'I don't have a skill for that workflow yet. Please perform this action in IFS Cloud in your browser, " +
    "then export a HAR file from DevTools (Network tab → right-click → Save all as HAR with content) " +
    "and use the build_ifs_skill_guide prompt to create a skill for it.' " +
    "If the response contains error 'authentication_required', immediately call start_oauth — do not relay the error to the user or ask them to authenticate manually. " +
    "Targets the active IFS environment unless 'environment' is given. " +
    "If the response contains error 'no_environment_selected', do not guess — show the user the listed environments and ask which one to use, then call use_ifs_environment. " +
    "Pass an If-Match header for conditional PATCH/DELETE on projections that require optimistic concurrency (check the API guide or a prior GET response's @odata.etag). " +
    "Pass X-IFS-Content-Disposition to set the filename IFS uses for a file upload/download.",
  inputSchema: {
    type: "object",
    properties: {
      environment: {
        type: "string",
        description: "Optional: name of the IFS environment to target for this one call, overriding the active selection. Omit to use the active environment.",
      },
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
      headers: {
        type: "object",
        description: "Optional request headers. Only If-Match, If-None-Match (OData optimistic concurrency) and X-IFS-Content-Disposition (IFS's custom header for naming an uploaded/downloaded file) are allowed — any other header is rejected.",
        additionalProperties: { type: "string" },
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

function guardError(payload: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    isError: true,
  };
}

export async function handler(args: any, oauthManager: OAuthManager) {
  const { sessionId, endpoint, method, body, environment, headers } = args;

  const badHeaders = disallowedHeaders(headers);
  if (badHeaders.length > 0) {
    return guardError({
      error: "disallowed_headers",
      message: `These headers are not allowed: ${badHeaders.join(", ")}. Only ${[...ALLOWED_REQUEST_HEADERS].join(", ")} are permitted.`,
      disallowed: badHeaders,
    });
  }

  const config = loadConfig();
  const envNames = Object.keys(config.environments);

  // No environments configured at all.
  if (envNames.length === 0 && !process.env.API_BASE_URL) {
    return guardError({
      error: "no_environment_configured",
      message: "No IFS environment is configured. Ask the user for their IFS Cloud URL, OAuth realm, and client ID, then call add_ifs_environment.",
    });
  }

  // Resolve which environment this call targets.
  const targetEnvName = environment ?? config.activeEnv;

  // Prod-safety: when more than one environment exists and none is selected,
  // refuse rather than silently defaulting (avoids accidental production hits).
  if (!targetEnvName && envNames.length > 1) {
    return guardError({
      error: "no_environment_selected",
      message: "Multiple IFS environments exist but none is selected. Ask the user which one to use, then call use_ifs_environment.",
      environments: envNames,
    });
  }

  if (environment && !config.environments[environment]) {
    return guardError({
      error: "unknown_environment",
      message: `Environment '${environment}' is not configured.`,
      environments: envNames,
    });
  }

  // Read-only environments block mutating methods.
  const targetEnv = targetEnvName ? getEnvironment(targetEnvName) : null;
  if (targetEnv?.readOnly && method !== "GET") {
    return guardError({
      error: "read_only_environment",
      message: `Environment '${targetEnvName}' is marked read-only; ${method} is blocked. Only GET requests are allowed.`,
    });
  }

  // Per-call override is threaded through as the session key (== env name).
  const effectiveSessionId = sessionId ?? environment;

  const result = await callProtectedApi(
    { endpoint, method, sessionId: effectiveSessionId, body, headers },
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
