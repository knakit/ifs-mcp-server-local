# Configuration Guide

## Environment Variables

This MCP server uses environment variables for configuration. You can set them using a `.env` file.

### Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your IFS Cloud instance details:
   ```bash
   # IFS Cloud Configuration
   API_BASE_URL=https://your-instance.ifs.cloud
   OAUTH_REALM=your-realm-name

   # OAuth 2.0 Credentials
   OAUTH_CLIENT_ID=your-client-id
   OAUTH_CLIENT_SECRET=your-client-secret
   ```

### Available Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_BASE_URL` | Base URL for your IFS Cloud instance (e.g., `https://your-instance.ifs.cloud`) | Yes |
| `OAUTH_REALM` | Keycloak realm name | Yes |
| `OAUTH_CLIENT_ID` | OAuth 2.0 client ID | Yes |
| `OAUTH_CLIENT_SECRET` | OAuth 2.0 client secret | Yes |

### Security Notes

- **Never commit `.env` to version control** - it contains sensitive credentials
- The `.env.example` file is safe to commit as a template
- `.env` is already in `.gitignore`
- For production, consider using a secrets management service

### Alternative Configuration Methods

You can also set environment variables:

**Command Line:**
```bash
API_BASE_URL=https://prod.ifs.cloud node build/index.js
```

**Shell Export:**
```bash
export API_BASE_URL=https://prod.ifs.cloud
node build/index.js
```
