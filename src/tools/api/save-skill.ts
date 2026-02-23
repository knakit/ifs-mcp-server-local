import { Tool } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getResourcesDir(): string {
  const skillsDir = process.env.SKILLS_DIR;
  if (skillsDir) return path.resolve(skillsDir);
  return path.resolve(__dirname, "..", "..", "resources");
}

export const definition: Tool = {
  name: "save_skill",
  description:
    "Save an IFS resource guide (skill) to the skills library. " +
    "For new skills, writes immediately. For existing skills, writes the update and returns a summary of what changed. " +
    "Call this after drafting a skill with build_ifs_guide.",
  inputSchema: {
    type: "object",
    properties: {
      filename: {
        type: "string",
        description: "Filename for the skill. Must end in .md and follow the naming convention: ifs-[module]-[area].md, e.g. 'ifs-procurement-purchase-orders.md', 'ifs-sales-customer-orders.md'.",
      },
      content: {
        type: "string",
        description: "Full markdown content of the skill guide.",
      },
    },
    required: ["filename", "content"],
  },
};

// Extract ## section headings from markdown content
function extractSections(content: string): string[] {
  return content
    .split("\n")
    .filter((l) => l.startsWith("## "))
    .map((l) => l.replace(/^##\s+/, "").trim());
}

// Extract all backtick field lists from lines like: `Field1`, `Field2`
function extractFields(content: string): Set<string> {
  const fields = new Set<string>();
  const matches = content.matchAll(/`([A-Z][A-Za-z0-9_]+)`/g);
  for (const m of matches) fields.add(m[1]);
  return fields;
}

// Count OData example URLs (lines starting with GET /main or /main/ifsapplications)
function countExamples(content: string): number {
  return content.split("\n").filter((l: string) => l.trim().match(/^(GET\s+)?\/main\/ifsapplications/)).length;
}

function buildChangeSummary(oldContent: string, newContent: string): string {
  const oldSections = extractSections(oldContent);
  const newSections = extractSections(newContent);

  const addedSections = newSections.filter((s) => !oldSections.includes(s));
  const removedSections = oldSections.filter((s) => !newSections.includes(s));

  const oldFields = extractFields(oldContent);
  const newFields = extractFields(newContent);
  const addedFields = [...newFields].filter((f) => !oldFields.has(f));
  const removedFields = [...oldFields].filter((f) => !newFields.has(f));

  const oldExamples = countExamples(oldContent);
  const newExamples = countExamples(newContent);
  const exampleDelta = newExamples - oldExamples;

  const lines: string[] = [];

  if (addedSections.length) lines.push(`+ Sections added: ${addedSections.join(", ")}`);
  if (removedSections.length) lines.push(`- Sections removed: ${removedSections.join(", ")}`);
  if (addedFields.length) lines.push(`+ Fields added: ${addedFields.join(", ")}`);
  if (removedFields.length) lines.push(`- Fields removed: ${removedFields.join(", ")}`);
  if (exampleDelta > 0) lines.push(`+ ${exampleDelta} new example(s) added`);
  if (exampleDelta < 0) lines.push(`- ${Math.abs(exampleDelta)} example(s) removed`);

  if (lines.length === 0) {
    // Content changed but structure is the same — note the size difference
    const sizeDelta = newContent.length - oldContent.length;
    if (sizeDelta === 0) return "No changes detected.";
    lines.push(sizeDelta > 0 ? `Content expanded by ~${sizeDelta} characters` : `Content reduced by ~${Math.abs(sizeDelta)} characters`);
  }

  return lines.join("\n");
}

export async function handler(args: any) {
  let { filename, content } = args || {};

  if (!filename || !content) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: "filename and content are required" }) }],
      isError: true,
    };
  }

  if (!filename.endsWith(".md")) filename += ".md";

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
  const isUpdate = fs.existsSync(destPath);

  let changeSummary: string | null = null;
  if (isUpdate) {
    const oldContent = fs.readFileSync(destPath, "utf-8");
    changeSummary = buildChangeSummary(oldContent, content);
  }

  fs.writeFileSync(destPath, content, "utf-8");

  const heading = content.split("\n").find((l: string) => l.startsWith("# "))?.replace(/^#\s+/, "").trim() ?? filename;

  const result: Record<string, unknown> = {
    success: true,
    action: isUpdate ? "updated" : "created",
    skill: heading,
    filename,
    path: destPath,
    note: "The skill is available immediately — no restart needed.",
  };

  if (changeSummary) result.changes = changeSummary;

  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
}
