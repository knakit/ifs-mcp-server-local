import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { OAuthManager } from "../lib/auth/oauth-manager.js";
import { tools } from "../tools/index.js";

export class OAuthMCPServer {
  private server: Server;
  private oauthManager: OAuthManager;

  constructor(oauthManager: OAuthManager) {
    this.oauthManager = oauthManager;
    this.server = new Server(
      {
        name: "oauth-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
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
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
