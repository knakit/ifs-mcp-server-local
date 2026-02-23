import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { OAuthManager } from "../lib/auth/oauth-manager.js";
import { tools } from "../tools/index.js";
import { getResources } from "../resources/index.js";
import { prompts } from "../prompts/index.js";

export class OAuthMCPServer {
  private server: Server;
  private oauthManager: OAuthManager;

  constructor(oauthManager: OAuthManager) {
    this.oauthManager = oauthManager;
    this.server = new Server(
      {
        name: "ifs-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: tools.map(tool => tool.definition),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = tools.find(t => t.definition.name === name);

      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      // Pass oauthManager to all tools (some need it, others ignore it)
      return await tool.handler(args, this.oauthManager);
    });

    // List available resources (scanned fresh each request for hot-reload)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: getResources().map((r) => r.definition),
    }));

    // Read a specific resource (scanned fresh each request for hot-reload)
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      const resource = getResources().find((r) => r.definition.uri === uri);

      if (!resource) {
        throw new Error(`Unknown resource: ${uri}`);
      }

      return await resource.handler(uri);
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: prompts.map((p) => p.definition),
    }));

    // Get a specific prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const prompt = prompts.find((p) => p.definition.name === name);

      if (!prompt) {
        throw new Error(`Unknown prompt: ${name}`);
      }

      return await prompt.handler(args ?? {});
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
