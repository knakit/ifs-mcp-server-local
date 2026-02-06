import * as startOAuth from "./auth/start-oauth.js";
import * as getSessionInfo from "./auth/get-session-info.js";
import * as callProtectedApi from "./api/call-protected-api.js";
import * as searchQuickReports from "./ifs-quick-reports/search-quick-reports.js";
import * as getReportParameters from "./ifs-quick-reports/get-report-parameters.js";
import * as executeQuickReport from "./ifs-quick-reports/execute-quick-report.js";
import * as listReportCategories from "./ifs-quick-reports/list-report-categories.js";

export const tools = [
  startOAuth,
  getSessionInfo,
  callProtectedApi,
  searchQuickReports,
  getReportParameters,
  executeQuickReport,
  listReportCategories,
];
