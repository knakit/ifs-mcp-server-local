import express from "express";
import { OAuthManager } from "../lib/auth/oauth-manager.js";
import { tokenStore } from "../lib/auth/token-store.js";
import { saveSession } from "../lib/auth/session-manager.js";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function startCallbackServer(oauthManager: OAuthManager) {
  const app = express();

  app.get("/oauth/callback", async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      res.send(`
        <html>
          <body>
            <h1>Authentication Failed</h1>
            <p>Error: ${escapeHtml(String(error))}</p>
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
            <p>Session saved. You can close this window and start using the MCP tools.</p>
          </body>
        </html>
      `);
    } catch (err) {
      res.send(`
        <html>
          <body>
            <h1>Authentication Failed</h1>
            <p>Error: ${escapeHtml((err as Error).message)}</p>
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
