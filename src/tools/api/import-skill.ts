import { Tool } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getResourcesDir(): string {
  const skillsDir = process.env.SKILLS_DIR;
  if (skillsDir) return path.resolve(skillsDir);
  return path.resolve(__dirname, "..", "..", "resources");
}

const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

export const definition: Tool = {
  name: "import_skill",
  description:
    "Import an IFS resource guide (skill) from an HTTPS URL or local file path and make it available immediately. " +
    "Useful for sharing skills between users — share the .md file and others can import it with this tool. " +
    "The skill is available immediately after import — no restart needed.",
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        description:
          "HTTPS URL or absolute local file path to the skill .md file. " +
          "GitHub raw URLs work well: https://raw.githubusercontent.com/user/repo/main/skills/my-skill.md",
      },
      filename: {
        type: "string",
        description:
          "Optional. Filename to save as (e.g. 'ifs-purchase-orders.md'). " +
          "Defaults to the last segment of the source URL or path. Must end in .md",
      },
    },
    required: ["source"],
  },
};

function fetchUrl(url: string, redirectsLeft = MAX_REDIRECTS): Promise<string> {
  return new Promise((resolve, reject) => {
    // Only allow HTTPS for remote fetches
    if (!url.startsWith("https://")) {
      return reject(new Error("Only HTTPS URLs are allowed for remote skill import"));
    }

    let settled = false;
    const req = https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        const location = res.headers.location;
        if (!location) return reject(new Error("Redirect with no Location header"));
        if (redirectsLeft <= 0) return reject(new Error("Too many redirects"));
        res.resume(); // discard response body
        return fetchUrl(location, redirectsLeft - 1).then(resolve).catch(reject);
      }
      if (!res.statusCode || res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
      }
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => { if (!settled) { settled = true; resolve(Buffer.concat(chunks).toString("utf-8")); } });
      res.on("error", (e) => { if (!settled) { settled = true; reject(e); } });
    });

    req.setTimeout(FETCH_TIMEOUT_MS, () => {
      settled = true;
      req.destroy(new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms`));
    });
    req.on("error", (e) => { if (!settled) { settled = true; reject(e); } });
  });
}

export async function handler(args: any) {
  const { source, filename: rawFilename } = args || {};

  if (!source) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: "source is required" }) }],
      isError: true,
    };
  }

  // Resolve filename
  let filename = rawFilename;
  if (!filename) {
    const segment = source.split(/[/\\]/).pop() ?? "imported-skill.md";
    filename = segment.includes(".") ? segment : segment + ".md";
  }
  if (!filename.endsWith(".md")) filename += ".md";

  // Fetch content
  let content: string;
  try {
    if (source.startsWith("http://") || source.startsWith("https://")) {
      content = await fetchUrl(source);
    } else {
      content = fs.readFileSync(source, "utf-8");
    }
  } catch (err: any) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: `Could not read source: ${err.message}` }) }],
      isError: true,
    };
  }

  // Basic validation — must look like a markdown guide
  if (!content.trim().startsWith("#")) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: "Source does not appear to be a valid skill file (must start with a # heading)" }),
        },
      ],
      isError: true,
    };
  }

  // Write to resources directory
  const resourcesDir = getResourcesDir();
  if (!fs.existsSync(resourcesDir)) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: `Resources directory not found: ${resourcesDir}` }) }],
      isError: true,
    };
  }

  const destPath = path.resolve(resourcesDir, filename);
  if (!destPath.startsWith(path.resolve(resourcesDir) + path.sep)) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: "Invalid filename: must not contain path traversal sequences" }) }],
      isError: true,
    };
  }

  fs.writeFileSync(destPath, content, "utf-8");

  // Extract name from heading for a friendly message
  const heading = content.split("\n").find((l) => l.startsWith("# "))?.replace(/^#\s+/, "").trim() ?? filename;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            skill: heading,
            saved_as: filename,
            path: destPath,
            note: "The skill is available immediately — no restart needed.",
          },
          null,
          2
        ),
      },
    ],
  };
}
