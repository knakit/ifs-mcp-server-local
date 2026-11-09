import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getResources, MCPResource } from "../../resources/index.js";

export const definition: Tool = {
  name: "get_api_guide",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  description: "Look up the skill guide for an IFS workflow before querying the API. IFS Cloud endpoint paths, projection names, key fields, and OData filter syntax are customer-specific and non-standard — they cannot be inferred from general OData or REST knowledge. Call this first with a keyword (e.g. 'customer', 'sales', 'parts') to get the correct endpoints and query patterns. Call without arguments to list all available guides. To find which projection a screen or page uses, load the 'ifs-framework-client-navigator' guide. If no guide matches, the result explains how to find the projection via the navigator and offer to build a new skill.",
  inputSchema: {
    type: "object",
    properties: {
      guide: {
        type: "string",
        description:
          "The guide to retrieve — one or more keywords, or an exact guide name (e.g. 'ifs-common-odata-reference'). Matched case-insensitively against each guide's name, URI and description; the best match is returned. Lists all available guides if omitted.",
      },
    },
  },
};

// Words that carry no signal for matching (every guide is IFS, most mention "use"/"when").
const STOPWORDS = new Set(["ifs", "the", "and", "for", "use", "when", "with", "from", "that", "this", "how", "what", "which", "guide", "skill"]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

interface Scored {
  resource: MCPResource;
  score: number;
}

// Exact slug/URI match wins outright; otherwise score each guide on how many of
// the query words appear in its slug/name (strong) or description (weak).
function scoreGuides(resources: MCPResource[], query: string): Scored[] {
  const needle = query.trim().toLowerCase();
  const tokens = tokenize(needle);

  const scored = resources.map((resource) => {
    const uri = resource.definition.uri.toLowerCase();
    const slug = uri.replace(/^ifs:\/\//, "").replace(/\/guide$/, "");
    const name = (resource.definition.name ?? "").toLowerCase();
    const description = (resource.definition.description ?? "").toLowerCase();

    if (needle === slug || needle === uri || needle === name) {
      return { resource, score: 1000 };
    }

    let score = 0;
    if (needle.length >= 3 && (slug.includes(needle) || name.includes(needle))) score += 10;
    for (const token of tokens) {
      if (slug.includes(token) || name.includes(token)) score += 3;
      if (description.includes(token)) score += 1;
    }
    return { resource, score };
  });

  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
}

// Returned when no guide matches. The model resolves the projection through the
// navigator guide, confirms with the user, and only then builds a new skill.
const NO_MATCH_INSTRUCTION = [
  "No existing skill guide matches that request. Do NOT guess or probe IFS endpoints.",
  "Do NOT tell the user you cannot help yet — first try to find the right page through the IFS client navigator:",
  "1. If the user already named a projection (e.g. 'CustomerHandling'), skip to step 3 with that projection.",
  "2. Otherwise call get_api_guide({ guide: 'ifs-framework-client-navigator' }) and follow it, using call_protected_api to search the navigator for the screen/page name in the user's own words. Deduplicate hits by Projection.",
  "   - No hits: tell the user the screen was not found in the navigator and offer to build a skill from a HAR recording (build_ifs_skill_from_har).",
  "   - Present the hit(s) to the user as a table of Label | PageType | Projection, and ASK whether they want a skill created from the projection. If there are SEVERAL distinct hits, always ask which one to use — never pick one yourself and never create a skill without an explicit answer. If the only hit is an /Assistant (wizard), include the assistant warning from the navigator guide.",
  "3. Only after the user confirms a projection: call get_api_guide({ guide: 'ifs-skill-authoring' }), fetch /main/ifsapplications/projection/v1/{Projection}.svc/$openapi?V2 with call_protected_api, work through it with the user as the authoring guide describes, and save it with save_skill (this is what the build_ifs_skill_from_projection prompt does).",
  "4. When the skill is saved, continue with the user's original request using the new guide.",
].join("\n");

export async function handler(args: any) {
  const { guide } = args || {};
  const resources = getResources();

  if (!guide) {
    const available = resources.map((r) => ({
      name: r.definition.name,
      uri: r.definition.uri,
      description: r.definition.description,
    }));
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ available_guides: available }, null, 2),
        },
      ],
    };
  }

  const matches = scoreGuides(resources, String(guide));

  if (matches.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: `No guide found for '${guide}'.`,
            available_guides: resources.map((r) => r.definition.uri),
            instruction: NO_MATCH_INSTRUCTION,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }

  const best = matches[0];
  const result = await best.resource.handler(best.resource.definition.uri);
  let text = (result.contents[0]?.text as string) || "Guide content not available";

  // A close runner-up means the query was ambiguous: tell the model so it can
  // load the other guide too instead of silently missing it.
  const others = matches
    .slice(1, 4)
    .filter((m) => best.score < 1000 && m.score >= best.score / 2)
    .map((m) => m.resource.definition.uri.replace(/^ifs:\/\//, "").replace(/\/guide$/, ""));
  if (others.length > 0) {
    text += `\n\n---\nOther guides also matched '${guide}': ${others.join(", ")}. Call get_api_guide with one of those names if this guide does not cover the request.`;
  }

  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}
