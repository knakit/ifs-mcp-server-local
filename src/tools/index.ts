import * as startOAuth from "./auth/start-oauth.js";
import * as getSessionInfo from "./auth/get-session-info.js";
import * as callProtectedApi from "./api/call-protected-api.js";
import * as getApiGuide from "./api/get-api-guide.js";
import * as exportApiData from "./api/export-api-data.js";
import * as importSkill from "./api/import-skill.js";
import * as saveSkill from "./api/save-skill.js";
import * as parseHarFile from "./api/parse-har-file.js";
import * as readOpenapiFile from "./api/read-openapi-file.js";
import * as addIfsEnvironment from "./env/add-ifs-environment.js";
import * as listIfsEnvironments from "./env/list-ifs-environments.js";
import * as useIfsEnvironment from "./env/use-ifs-environment.js";
import * as removeIfsEnvironment from "./env/remove-ifs-environment.js";

export const tools = [
  addIfsEnvironment,
  listIfsEnvironments,
  useIfsEnvironment,
  removeIfsEnvironment,
  startOAuth,
  getSessionInfo,
  callProtectedApi,
  getApiGuide,
  exportApiData,
  importSkill,
  saveSkill,
  parseHarFile,
  readOpenapiFile,
];
