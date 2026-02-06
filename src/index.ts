#!/usr/bin/env node
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from project root (not cwd, which may differ when launched by MCP clients)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env"), quiet: true });

import { OAuthManager } from "./lib/auth/oauth-manager.js";
import { initializeTokenStore } from "./lib/auth/session-manager.js";
import { startCallbackServer } from "./server/oauth-callback-server.js";
import { OAuthMCPServer } from "./server/mcp-server.js";

// Initialize OAuth manager
const oauthManager = new OAuthManager();

// Initialize sessions from storage
initializeTokenStore();

// Start the OAuth callback server
startCallbackServer(oauthManager);

// Start the MCP server
const mcpServer = new OAuthMCPServer(oauthManager);
mcpServer.run().catch(console.error);
