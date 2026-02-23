import { Prompt, GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { parseHar, summariseHar } from "../lib/har-parser.js";
import { parseOpenApi, summariseOpenApi } from "../lib/openapi-parser.js";

export const definition: Prompt = {
  name: "build_ifs_guide",
  description:
    "Build or update an IFS resource guide (skill) from a browser HAR file, a downloaded OpenAPI/Swagger spec, " +
    "or by fetching the spec live from an authenticated IFS session. " +
    "Claude will walk you through what was found, ask clarifying questions, " +
    "draft a guide in the correct format, and save it automatically. " +
    "Provide exactly one of: har_file_path, openapi_file_path, or projection_name.",
  arguments: [
    {
      name: "har_file_path",
      description:
        "Absolute path to a .har file exported from browser DevTools. " +
        "Best for transactional workflows (orders, purchase orders, etc.).",
      required: false,
    },
    {
      name: "openapi_file_path",
      description:
        "Absolute path to a downloaded OpenAPI/Swagger JSON file for a projection service. " +
        "Best for master data (customers, suppliers, parts). " +
        "Download from: {server}/main/ifsapplications/projection/v1/{ServiceName}.svc/$openapi?V2",
      required: false,
    },
    {
      name: "projection_name",
      description:
        "Projection service name to fetch the OpenAPI spec live from IFS (e.g. 'CustomerHandling', 'SupplierHandling'). " +
        "Requires an active authenticated session. " +
        "Best for master data when you don't want to download the spec manually.",
      required: false,
    },
  ],
};

// ---------------------------------------------------------------------------
// Shared output format instructions (used in all three modes)
// ---------------------------------------------------------------------------

const outputFormat = `
## Output format

The skill must follow this structure exactly:

\`\`\`markdown
# [Guide Name]

[1–2 sentence description of what this guide enables.]

Use the \`call_protected_api\` tool with the endpoints below to [purpose].

## Base Path

All endpoints below are relative to this base:
\`\`\`
/main/ifsapplications/projection/v1/[ServiceName].svc
\`\`\`

---

## 1. [Operation Name]

[What this operation does in plain language.]

**Endpoint:**
\`\`\`
/main/ifsapplications/projection/v1/[ServiceName].svc/[EntitySet]
\`\`\`

**Method:** GET | POST | PATCH | DELETE

**Useful fields for \`$select\`:**
\`Field1\`, \`Field2\`, \`Field3\`

**Examples:**

[Business-meaningful label]:
\`\`\`
[example URL or request body]
\`\`\`

**Response shape:**
\`\`\`json
{ "value": [{ ... }] }
\`\`\`

[Repeat for each operation]

---

## Recommended Workflows

[Numbered multi-step workflows combining calls]

> Before fetching large datasets, add \`$count=true\` to check result size. If results exceed 10 records, confirm with the user before fetching all data.

For OData query syntax, use \`get_api_guide({ guide: "ifs-common-odata-reference" })\`.
\`\`\`

## After drafting

1. Ask the user: "What should the filename be? Use the format \`ifs-[module]-[area]\`, e.g. \`ifs-sales-customers\` → saved as .md"
   - If they want to update an existing skill, use its existing filename.

2. Call \`save_skill({ filename: "...", content: "..." })\` immediately — no further approval needed.

3. Read the result:
   - If \`action\` is \`"created"\`: tell the user the new skill was saved and is available immediately via \`get_api_guide\` — no restart needed.
   - If \`action\` is \`"updated"\`: present the \`changes\` summary clearly so the user can see what was updated. Confirm it is live immediately.
   - If there is an error: report it and ask the user to check the filename or path.

4. After a successful save:
   - The skill is live immediately — use \`get_api_guide\` right away.
   - To share: others can import it via \`import_skill({ source: "HTTPS URL to the .md file" })\`.
`;

// ---------------------------------------------------------------------------
// HAR-mode system instructions
// ---------------------------------------------------------------------------

const harSystemInstructions = `You are helping the user build an IFS MCP resource guide from a browser HAR file analysis.
${outputFormat}

## How to work with the user (HAR mode)

Work through one projection service at a time. For each service:

1. Ask: "What is this projection used for in your business? (e.g. 'managing purchase orders')"
2. For each operation (entity set + method), ask:
   - "What does [METHOD] [entity] represent in your workflow?"
   - "Are there field names that need explanation?" (only ask if the fields aren't self-explanatory)
   - For filter patterns: "Should I include this filter pattern as an example, or is it too specific to skip?"
   - For POST/PATCH: "Which of these fields are required vs optional from a business perspective?"
3. Ask: "Are there workflows that combine multiple calls I should document?" (e.g. create header → add lines → release)
4. Ask: "Any status/state values I should list? (e.g. what does Objstate = 'Released' mean?)"

Keep questions focused — ask 2 at a time maximum. Use the user's own words in descriptions.

## Rules for the draft (HAR mode)
- Replace all real data values (customer numbers, order numbers, dates) with realistic placeholders (e.g. 'CUST-001', 'PO-10001', '2024-01-15')
- Preserve IfsApp enum values exactly as seen (they are structural, not sensitive)
- Only include operations and filter patterns the user confirms are useful
- Do not invent operations not seen in the HAR`;

// ---------------------------------------------------------------------------
// OpenAPI-mode system instructions (shared by local-file and live-fetch)
// ---------------------------------------------------------------------------

const openApiSystemInstructions = `You are helping the user build an IFS MCP resource guide from an OpenAPI/Swagger specification.
${outputFormat}

## How to work with the user (OpenAPI mode)

The spec lists the full API surface. Work selectively — not everything needs to be in the skill:

1. If multiple entity sets found: "Which of these do your users actually work with? (list them)"
2. For each relevant entity set:
   - "What does [EntitySet] represent in your business?"
   - "Are there field names that need explanation?" (focus on non-obvious ones)
   - "Which required fields would a user always provide vs. which should be defaulted automatically?"
   - "Are there status or enum values worth documenting?"
3. For POST/PATCH operations: derive a realistic example request body from required + key optional properties
4. For GET operations: suggest common \`$filter\` patterns based on the key property and any searchable string fields
5. Ask: "Are there multi-step workflows to document?" (e.g. create → validate → link to another entity)

Keep to 2 questions per message. Use the user's own words in all descriptions.

## Rules for the draft (OpenAPI mode)
- Required properties: document clearly with type, notes, and example placeholder values
- Optional properties: list in a reference table, mark as optional
- Derive realistic placeholder values matching field type and maxLength
- Only include operations the user confirms are needed — don't dump the entire spec
- Suggest \`$filter\` patterns: \`contains(Name,'{value}')\` for string search fields, \`eq '{value}'\` for key fields
- Do not invent operations not in the spec
- For enums: list all values with a short explanation of what each means (ask the user)`;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handler(args: Record<string, string>): Promise<GetPromptResult> {
  const { har_file_path, openapi_file_path, projection_name } = args;

  const provided = [har_file_path, openapi_file_path, projection_name].filter(Boolean);

  // --- No arguments ---
  if (provided.length === 0) {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "I want to build an IFS resource guide skill, but I didn't provide an input source.\n\n" +
              "Please provide exactly one of:\n" +
              "- **`har_file_path`** — path to a .har file captured in browser DevTools (for transactional workflows)\n" +
              "- **`openapi_file_path`** — path to a downloaded Swagger JSON file (for master data)\n" +
              "- **`projection_name`** — projection service name to fetch the spec live from IFS (e.g. `CustomerHandling`)\n\n" +
              "Which approach would you like to use?",
          },
        },
      ],
    };
  }

  // --- Multiple arguments ---
  if (provided.length > 1) {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              "I provided more than one input source to `build_ifs_guide`. Please use exactly one of:\n" +
              "- `har_file_path`\n" +
              "- `openapi_file_path`\n" +
              "- `projection_name`",
          },
        },
      ],
    };
  }

  // --- HAR mode (unchanged) ---
  if (har_file_path) {
    let harSummary: string;
    let parseError: string | null = null;

    try {
      const parsed = parseHar(har_file_path);
      harSummary = summariseHar(parsed);
    } catch (err: any) {
      parseError = err.message;
      harSummary = "";
    }

    const userMessage = parseError
      ? `I want to build an IFS resource guide but there was a problem reading the HAR file at \`${har_file_path}\`:\n\n**Error:** ${parseError}\n\nPlease let me know if the path is correct or if I should try a different file.`
      : `I want to build an IFS resource guide from a HAR file I captured in my browser.\n\nHere is what was found in \`${har_file_path}\`:\n\n${harSummary}\n\nPlease help me turn this into a proper IFS resource guide .md file.`;

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `${harSystemInstructions}\n\n---\n\n${userMessage}`,
          },
        },
      ],
    };
  }

  // --- Local OpenAPI file mode ---
  if (openapi_file_path) {
    let specSummary: string;
    let parseError: string | null = null;

    try {
      const parsed = parseOpenApi(openapi_file_path);
      specSummary = summariseOpenApi(parsed);
    } catch (err: any) {
      parseError = err.message;
      specSummary = "";
    }

    const userMessage = parseError
      ? `I want to build an IFS resource guide from an OpenAPI spec file at \`${openapi_file_path}\`, but there was a problem reading it:\n\n**Error:** ${parseError}\n\nPlease check that the path is correct and the file is a valid JSON OpenAPI/Swagger spec.`
      : `I want to build an IFS resource guide from a downloaded OpenAPI/Swagger spec.\n\nHere is a summary of what was found in \`${openapi_file_path}\`:\n\n${specSummary}\n\nPlease help me turn this into a proper IFS resource guide .md file.`;

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `${openApiSystemInstructions}\n\n---\n\n${userMessage}`,
          },
        },
      ],
    };
  }

  // --- Live fetch mode ---
  // projection_name is provided — instruct Claude to fetch the spec itself
  const fetchEndpoint = `/main/ifsapplications/projection/v1/${projection_name}.svc/$openapi?V2`;

  const userMessage =
    `I want to build an IFS resource guide for the **${projection_name}** projection service by fetching its OpenAPI spec live.\n\n` +
    `Please do the following:\n\n` +
    `1. Call \`call_protected_api\` with:\n` +
    `   - endpoint: \`${fetchEndpoint}\`\n` +
    `   - method: \`GET\`\n\n` +
    `2. The response will be a Swagger 2.0 JSON spec. From it, extract:\n` +
    `   - The service name (from \`info.title\`)\n` +
    `   - All entity sets (from \`paths\` — group by entity set name, strip \`('{key}')\` suffix)\n` +
    `   - For each entity set: available HTTP methods, key property, and all properties with types from \`definitions\`\n` +
    `   - Required properties (from the schema's \`required\` array)\n` +
    `   - Any enum values on individual properties\n` +
    `   - Any IfsApp action paths\n\n` +
    `3. Present a compact summary of what you found (entity sets, methods, property counts) — no raw JSON.\n\n` +
    `4. Then follow the OpenAPI skill-building workflow: ask me clarifying questions about which operations I need, ` +
    `what field names mean, and any workflows to document. Keep to 2 questions at a time.\n\n` +
    `5. Draft and save the skill following the standard format.`;

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `${openApiSystemInstructions}\n\n---\n\n${userMessage}`,
        },
      },
    ],
  };
}
