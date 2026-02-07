import { Resource, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface MCPResource {
  definition: Resource;
  handler: (uri: string) => Promise<ReadResourceResult>;
}

function loadMarkdownResource(filename: string): string {
  // Check build directory first, then source directory
  const buildPath = path.join(__dirname, filename);
  const srcPath = path.resolve(__dirname, "..", "..", "src", "resources", filename);

  if (fs.existsSync(buildPath)) {
    return fs.readFileSync(buildPath, "utf-8");
  }
  if (fs.existsSync(srcPath)) {
    return fs.readFileSync(srcPath, "utf-8");
  }
  return `Resource file ${filename} not found`;
}

const ifsQuickReports: MCPResource = {
  definition: {
    uri: "ifs://quick-reports/guide",
    name: "IFS Quick Reports API Guide",
    description:
      "Guide for using call_protected_api to search, list, get parameters for, and execute IFS Cloud Quick Reports via OData endpoints",
    mimeType: "text/markdown",
  },
  handler: async (uri: string) => ({
    contents: [
      {
        uri,
        mimeType: "text/markdown",
        text: loadMarkdownResource("ifs-quick-reports.md"),
      },
    ],
  }),
};

export const resources: MCPResource[] = [ifsQuickReports];
