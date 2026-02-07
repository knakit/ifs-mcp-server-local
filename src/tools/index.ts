import * as startOAuth from "./auth/start-oauth.js";
import * as getSessionInfo from "./auth/get-session-info.js";
import * as callProtectedApi from "./api/call-protected-api.js";
import * as getApiGuide from "./api/get-api-guide.js";

export const tools = [
  startOAuth,
  getSessionInfo,
  callProtectedApi,
  getApiGuide,
];
