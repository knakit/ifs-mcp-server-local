import * as startOAuth from "./auth/start-oauth.js";
import * as getSessionInfo from "./auth/get-session-info.js";
import * as callProtectedApi from "./api/call-protected-api.js";

export const tools = [
  startOAuth,
  getSessionInfo,
  callProtectedApi,
];
