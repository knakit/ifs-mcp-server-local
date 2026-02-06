import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { OAuthManager } from "../../lib/auth/oauth-manager.js";
import { getCurrentSessionId } from "../../lib/auth/session-manager.js";
import { tokenStore } from "../../lib/auth/token-store.js";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";

export const definition: Tool = {
  name: "start_oauth",
  description: "Start OAuth 2.0 authentication flow. Checks for active session and opens a login window if needed.",
  inputSchema: {
    type: "object",
    properties: {
      force: {
        type: "boolean",
        description: "Force re-authentication even if there's an active session",
      },
    },
  },
};

function openBrowser(url: string) {
  const platform = process.platform;
  let command: string;

  if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.error('Failed to open browser:', error);
    }
  });
}

function createLoginPage(authUrl: string, state: string): string {
  const tempDir = path.join(os.tmpdir(), 'ifs-mcp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const htmlPath = path.join(tempDir, `login-${state}.html`);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IFS Cloud Login</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 480px;
      width: 100%;
      padding: 48px 40px;
      text-align: center;
    }

    .logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      color: white;
      font-weight: bold;
    }

    h1 {
      font-size: 28px;
      color: #1a202c;
      margin-bottom: 12px;
      font-weight: 700;
    }

    .subtitle {
      font-size: 16px;
      color: #718096;
      margin-bottom: 32px;
      line-height: 1.5;
    }

    .info-box {
      background: #f7fafc;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin-bottom: 32px;
      text-align: left;
      border-radius: 4px;
    }

    .info-box p {
      font-size: 14px;
      color: #4a5568;
      line-height: 1.6;
      margin-bottom: 8px;
    }

    .info-box p:last-child {
      margin-bottom: 0;
    }

    .info-box strong {
      color: #2d3748;
    }

    .login-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 16px 48px;
      font-size: 18px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 100%;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .login-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }

    .login-button:active {
      transform: translateY(0);
    }

    .security-note {
      margin-top: 24px;
      font-size: 12px;
      color: #a0aec0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .security-icon {
      font-size: 14px;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .container {
      animation: fadeIn 0.5s ease-out;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">IFS</div>
    <h1>Welcome to IFS Cloud</h1>
    <p class="subtitle">Sign in to access your protected resources through the MCP server</p>

    <div class="info-box">
      <p><strong>What happens next:</strong></p>
      <p>1. Click the button below to open the IFS login page</p>
      <p>2. Enter your credentials on the IFS Cloud portal</p>
      <p>3. You'll be redirected back automatically</p>
      <p>4. Your session will be saved securely</p>
    </div>

    <button class="login-button" onclick="handleLogin()">
      🔐 Sign in to IFS Cloud
    </button>

    <div class="security-note">
      <span class="security-icon">🔒</span>
      <span>Secured with OAuth 2.0 + PKCE</span>
    </div>
  </div>

  <script>
    function handleLogin() {
      window.location.href = ${JSON.stringify(authUrl)};
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html);
  return htmlPath;
}

export async function handler(args: any, oauthManager: OAuthManager) {
  const { force = false } = args || {};

  // Check for existing active session
  if (!force) {
    const sessionId = getCurrentSessionId();
    if (sessionId) {
      const sessionData = tokenStore.get(sessionId);
      if (sessionData) {
        const now = Date.now();
        const isExpired = sessionData.expiresAt < now;

        if (!isExpired) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  status: "already_authenticated",
                  message: "You already have an active session",
                  sessionId: sessionId,
                  expiresInMinutes: Math.floor((sessionData.expiresAt - now) / 60000),
                  hint: "Use force:true to re-authenticate",
                }, null, 2),
              },
            ],
          };
        }
      }
    }
  }

  // Start OAuth flow
  const { authUrl, state } = oauthManager.startAuthFlow();

  // Create and open login page
  const htmlPath = createLoginPage(authUrl, state);
  const fileUrl = `file://${htmlPath}`;

  openBrowser(fileUrl);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          status: "login_window_opened",
          message: "Login window opened in your default browser",
          state: state,
          instructions: "Please complete the authentication in the browser window. After successful login, you'll be redirected back and your session will be saved automatically.",
          loginPagePath: htmlPath,
        }, null, 2),
      },
    ],
  };
}
