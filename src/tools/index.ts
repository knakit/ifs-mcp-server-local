import * as startOAuth from "./auth/start-oauth.js";
import * as getSessionInfo from "./auth/get-session-info.js";
import * as callProtectedApi from "./api/call-protected-api.js";
import * as getApiGuide from "./api/get-api-guide.js";
import * as exportApiData from "./api/export-api-data.js";
import * as importSkill from "./api/import-skill.js";
import * as saveSkill from "./api/save-skill.js";

export const tools = [
  startOAuth,
  getSessionInfo,
  callProtectedApi,
  getApiGuide,
  exportApiData,
  importSkill,
  saveSkill,
];
