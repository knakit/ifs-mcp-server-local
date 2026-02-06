# IFS Quick Reports MCP Tools

## Available Tools

### 1. search_quick_reports
Search for Quick Reports by description text.

```
search_quick_reports({ searchText: "Third Party invoiced" })

// With OData options
search_quick_reports({
  searchText: "session stats",
  select: "QuickReportId,Description",
  top: 10
})

// Advanced filter (bypasses searchText)
search_quick_reports({
  filter: "((startswith(tolower(Description),'customer')))",
  orderby: "QuickReportId asc"
})
```

**Inputs:** `searchText`, `filter`, `orderby`, `select`, `top`, `skip`, `sessionId`
**Endpoint:** `GET QuickReportHandling.svc/QuickReportSet`

---

### 2. get_report_parameters
Get the required parameters for a specific Quick Report before executing it.

```
get_report_parameters({ reportId: "12345" })
```

**Inputs:** `reportId` (required), `sessionId`
**Endpoint:** `GET QuickReports.svc/GetParameters(ReportId='...')`

---

### 3. execute_quick_report
Execute a Quick Report and return the results.

```
// Without parameters
execute_quick_report({ QuickReportId: "12345" })

// With parameters
execute_quick_report({
  QuickReportId: "12345",
  parameters: { "CustomerNo": "1001", "DateFrom": "2024-01-01" }
})
```

**Inputs:** `QuickReportId` (required), `parameters`, `sessionId`
**Endpoint:** `GET QuickReports.svc/QuickReport_{id}(...)`

---

### 4. list_report_categories
List all Quick Report categories for browsing/filtering.

```
list_report_categories()

// With filter
list_report_categories({
  filter: "contains(Description, 'Sales')",
  orderby: "CategoryId asc"
})
```

**Inputs:** `filter`, `orderby`, `select`, `top`, `skip`, `sessionId`
**Endpoint:** `GET QuickReportHandling.svc/ReportCategorySet`

---

## Authentication

All tools use automatic session detection:
- Authenticate once via `start_oauth`
- Sessions are saved to `~/.ifs-mcp/session.json` and persist across restarts
- Tokens are auto-refreshed when nearing expiry (5-minute buffer)
- Optional `sessionId` parameter available for multi-session scenarios

## Typical Workflow

```
1. list_report_categories()                        -- Browse categories
2. search_quick_reports({ searchText: "orders" })  -- Find a report
3. get_report_parameters({ reportId: "12345" })    -- Check required params
4. execute_quick_report({ QuickReportId: "12345", parameters: {...} })  -- Run it
```

## OData Query Support

The `search_quick_reports` and `list_report_categories` tools support standard OData query options:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `$filter` | Filter results | `CategoryId eq 'SALES'` |
| `$orderby` | Sort results | `QuickReportId asc` |
| `$select` | Choose fields | `QuickReportId,Description` |
| `$top` | Limit results | `10` |
| `$skip` | Skip results (pagination) | `20` |

## File Structure

```
src/tools/ifs-quick-reports/
├── search-quick-reports.ts    -- Search reports by description
├── get-report-parameters.ts   -- Get report parameter definitions
├── execute-quick-report.ts    -- Execute a report
└── list-report-categories.ts  -- List report categories
```

## API Endpoints

All endpoints are relative to `API_BASE_URL/main/ifsapplications/projection/v1/`:

| Endpoint | Used By |
|----------|---------|
| `QuickReportHandling.svc/QuickReportSet` | `search_quick_reports` |
| `QuickReportHandling.svc/ReportCategorySet` | `list_report_categories` |
| `QuickReports.svc/GetParameters(ReportId='...')` | `get_report_parameters` |
| `QuickReports.svc/QuickReport_{id}(...)` | `execute_quick_report` |

All endpoints use OAuth 2.0 Bearer token authentication.
