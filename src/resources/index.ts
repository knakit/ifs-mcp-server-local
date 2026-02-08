import { Resource, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface MCPResource {
  definition: Resource;
  handler: (uri: string) => Promise<ReadResourceResult>;
}

function getResourceDirs(): string[] {
  const dirs: string[] = [];
  // Check build directory first, then source directory
  if (fs.existsSync(__dirname)) dirs.push(__dirname);
  const srcPath = path.resolve(__dirname, "..", "..", "src", "resources");
  if (srcPath !== __dirname && fs.existsSync(srcPath)) dirs.push(srcPath);
  return dirs;
}

function discoverMarkdownFiles(): Map<string, string> {
  const files = new Map<string, string>(); // filename -> full path
  for (const dir of getResourceDirs()) {
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith(".md") && !files.has(file)) {
        files.set(file, path.join(dir, file));
      }
    }
  }
  return files;
}

function parseMetadata(content: string, filename: string): { name: string; description: string; slug: string } {
  const lines = content.split("\n");

  // Name from first # heading, fallback to filename
  const headingLine = lines.find((l) => l.startsWith("# "));
  const name = headingLine ? headingLine.replace(/^#\s+/, "").trim() : filename.replace(".md", "");

  // Description from first non-empty, non-heading line
  const descLine = lines.find((l) => l.trim() !== "" && !l.startsWith("#"));
  const description = descLine ? descLine.trim().replace(/[`*_]/g, "") : name;

  // URI slug from filename: "ifs-quick-reports.md" -> "ifs-quick-reports"
  const slug = filename.replace(".md", "");

  return { name, description, slug };
}

function buildResource(filename: string, filePath: string): MCPResource {
  const content = fs.readFileSync(filePath, "utf-8");
  const { name, description, slug } = parseMetadata(content, filename);
  const uri = `ifs://${slug}/guide`;

  return {
    definition: { uri, name, description, mimeType: "text/markdown" },
    handler: async (requestUri: string) => ({
      contents: [
        {
          uri: requestUri,
          mimeType: "text/markdown",
          text: fs.readFileSync(filePath, "utf-8"),
        },
      ],
    }),
  };
}

const discovered = discoverMarkdownFiles();
export const resources: MCPResource[] = Array.from(discovered.entries()).map(
  ([filename, filePath]) => buildResource(filename, filePath)
);
