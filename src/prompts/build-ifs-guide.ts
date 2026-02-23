import { Prompt, GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { parseHar, summariseHar } from "../lib/har-parser.js";

export const definition: Prompt = {
  name: "build_ifs_guide",
  description:
    "Build or update an IFS resource guide (skill) from a HAR file captured in your browser. " +
    "Claude will walk you through what was found, ask clarifying questions about each operation, " +
    "draft a guide in the correct format, and save it automatically. " +
    "When updating an existing skill, a summary of changes is shown before saving.",
  arguments: [
    {
      name: "har_file_path",
      description: "Absolute path to the .har file exported from browser DevTools",
      required: true,
    },
  ],
};

export async function handler(args: Record<string, string>): Promise<GetPromptResult> {
  const { har_file_path } = args;

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

  const systemInstructions = `You are helping the user build an IFS MCP resource guide from a browser HAR file analysis.

The target format matches the existing guides in src/resources/ (e.g. ifs-customer-orders.md). Here is the structure to follow:

---
# [Guide Name]

[1-2 sentence description of what this guide enables.]

Use the \`call_protected_api\` tool with the endpoints below to [purpose].

## Base Path
\`\`\`
/main/ifsapplications/projection/v1/[ServiceName].svc
\`\`\`

---

## 1. [Operation Name]
[Plain language description of what this does.]

**Endpoint:**
\`\`\`
/main/ifsapplications/projection/v1/[ServiceName].svc/[EntitySet]
\`\`\`

**Method:** GET | POST | PATCH | DELETE

**Useful fields for \`$select\`:**
\`Field1\`, \`Field2\`, \`Field3\`

**Examples:**
[Label]:
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
[Numbered multi-step workflows combining calls, based on what the user tells you]

> Before fetching large datasets, add \`$count=true\` to check result size. If results exceed 10 records, confirm with the user before fetching all data.

For OData query syntax, use \`get_api_guide({ guide: "ifs-common-odata-reference" })\`.
---

## How to work with the user

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

## Rules for the draft
- Replace all real data values (customer numbers, order numbers, dates) with realistic placeholders (e.g. 'CUST-001', 'PO-10001', '2024-01-15')
- Preserve IfsApp enum values exactly as seen (they are structural, not sensitive)
- Only include operations and filter patterns the user confirms are useful
- Do not invent operations not seen in the HAR

## After drafting

1. Ask the user: "What should the filename be? Use the format \`ifs-[module]-[area]\`, e.g. \`ifs-procurement-purchase-orders\` or \`ifs-sales-customer-orders\` → saved as .md"
   - If they want to update an existing skill, use its existing filename.

2. Call \`save_skill({ filename: "...", content: "..." })\` immediately — no further approval needed.

3. Read the result:
   - If \`action\` is \`"created"\`: tell the user the new skill was saved and is available immediately via \`get_api_guide\` — no restart needed.
   - If \`action\` is \`"updated"\`: present the \`changes\` summary clearly to the user so they can see what was updated. Then confirm it was saved and is live immediately.
   - If there is an error: report it and ask the user to check the filename or path.

4. After a successful save, let the user know:
   - The skill is live immediately — they can use \`get_api_guide\` right away.
   - To share: others can import it via \`import_skill({ source: "HTTPS URL to the .md file" })\`.`;

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `${systemInstructions}\n\n---\n\n${userMessage}`,
        },
      },
    ],
  };
}
