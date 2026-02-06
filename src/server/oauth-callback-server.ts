import express from "express";
import { OAuthManager } from "../lib/auth/oauth-manager.js";
import { tokenStore } from "../lib/auth/token-store.js";
import { saveSession } from "../lib/auth/session-manager.js";

export function startCallbackServer(oauthManager: OAuthManager) {
  const app = express();

  app.get("/oauth/callback", async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      res.send(`
        <html>
          <body>
            <h1>Authentication Failed</h1>
            <p>Error: ${error}</p>
          </body>
        </html>
      `);
      return;
    }

    try {
      const sessionId = await oauthManager.exchangeCode(
        code as string,
        state as string
      );

      // Save session to file
      const sessionData = tokenStore.get(sessionId);
      if (sessionData) {
        saveSession(sessionId, sessionData);
      }

      res.send(`
        <html>
          <body>
            <h1>Authentication Successful!</h1>
            <p>Session automatically saved!</p>
            <p>Your session ID: <code>${sessionId}</code></p>
            <p>The session has been stored in <code>~/.ifs-mcp/session.json</code></p>
            <p>You can close this window and start using the MCP tools.</p>
          </body>
        </html>
      `);
    } catch (error) {
      res.send(`
        <html>
          <body>
            <h1>Authentication Failed</h1>
            <p>Error: ${(error as Error).message}</p>
          </body>
        </html>
      `);
    }
  });

  const server = app.listen(3000);
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      // Port already in use, callback server already running
    } else {
      // Log other errors silently
    }
  });
}
