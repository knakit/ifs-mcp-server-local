# IFS Framework Quick Reports

Search, inspect and run IFS Quick Reports. Use when the user asks to find, list or run a quick report, report category, or ad-hoc/saved report by name or description.

Use the `call_protected_api` tool with the endpoints below to work with IFS Quick Reports. All endpoints use **GET**.

## Base Path

Two projections are involved. All endpoints below are relative to the base shown for each:
```
/main/ifsapplications/projection/v1/QuickReportHandling.svc   (search reports, list categories)
/main/ifsapplications/projection/v1/QuickReports.svc          (get parameters, execute a report)
```

> IFS Cloud requires double parentheses `((...))` around `$filter` expressions, and no space after the comma in function calls such as `startswith(tolower(Description),'text')`.

---

## 1. Search Quick Reports

Find reports by their description text.

**Endpoint:**
```
/main/ifsapplications/projection/v1/QuickReportHandling.svc/QuickReportSet
```

**Method:** GET (read-only)

**Useful fields for `$select`:**
`QuickReportId`, `Description`

**Examples:**

Search by description, case-insensitive:
```
/main/ifsapplications/projection/v1/QuickReportHandling.svc/QuickReportSet?$filter=((startswith(tolower(Description),'{term}')))&$select=QuickReportId,Description&$top=10
```

Example — "session stats":
```
/main/ifsapplications/projection/v1/QuickReportHandling.svc/QuickReportSet?$filter=((startswith(tolower(Description),'session stats')))&$select=QuickReportId,Description&$top=10
```

Other supported parameters: `$orderby` (e.g. `QuickReportId asc`), `$top`, `$skip` for paging.

**Response shape:**
```json
{ "value": [{ "QuickReportId": "12345", "Description": "Session Stats Report" }] }
```

---

## 2. List Report Categories

Lists the categories used to organise reports.

**Endpoint:**
```
/main/ifsapplications/projection/v1/QuickReportHandling.svc/ReportCategorySet
```

**Method:** GET (read-only)

**Useful fields for `$select`:**
`CategoryId`, `Description`

**Examples:**

First 20 categories:
```
/main/ifsapplications/projection/v1/QuickReportHandling.svc/ReportCategorySet?$orderby=CategoryId asc&$top=20
```

Supports the same OData parameters as endpoint 1 (`$filter`, `$select`, `$orderby`, `$top`, `$skip`).

**Response shape:**
```json
{ "value": [{ "CategoryId": "SALES", "Description": "Sales Reports" }] }
```

---

## 3. Get Report Parameters

Returns the parameters a report needs before it can be executed.

**Endpoint:**
```
/main/ifsapplications/projection/v1/QuickReports.svc/GetParameters(ReportId='{QuickReportId}')
```

**Method:** GET (read-only)

**Examples:**

Parameters of report 12345 (the `ReportId` value must be wrapped in single quotes):
```
/main/ifsapplications/projection/v1/QuickReports.svc/GetParameters(ReportId='12345')
```

**Response shape:**
```json
{ "value": [{ "ParameterName": "CustomerNo", "DataType": "STRING" }] }
```

---

## 4. Execute Quick Report

Runs a report with its parameters and returns the result rows.

**Endpoint:**
```
/main/ifsapplications/projection/v1/QuickReports.svc/QuickReport_{QuickReportId}(Param1='Value1',Param2='Value2')
```

**Method:** GET

- The report ID is appended after `QuickReport_` in the path.
- Parameters go inside the parentheses as comma-separated `Key='Value'` pairs.
- String values must be wrapped in single quotes; numeric values are passed without quotes.

**Examples:**

Report with parameters:
```
/main/ifsapplications/projection/v1/QuickReports.svc/QuickReport_12345(CustomerNo='1001',DateFrom='2024-01-01')
```

Report with no parameters:
```
/main/ifsapplications/projection/v1/QuickReports.svc/QuickReport_12345()
```

**Response shape:**
```json
{ "value": [{ "Column1": "...", "Column2": "..." }] }
```

---

## Recommended Workflows

### Find and run a quick report

1. **Search** for the report by description (endpoint 1). Use the user's own words for the term.
2. If several reports match, show them as a table of `QuickReportId | Description` and ask the user which one to run. Do not pick one yourself.
3. **Get the parameters** for the chosen report (endpoint 3). Ask the user for any parameter values you do not already have.
4. **Execute** the report with those parameters (endpoint 4).

### Browse by category

1. List the categories (endpoint 2) and show them to the user.
2. Search the reports with a description term from the chosen category (endpoint 1).

> Before executing a report, add `$count=true` to check the result size. If results exceed 10 records, confirm with the user before fetching all data.

For OData query syntax, use `get_api_guide({ guide: "ifs-common-odata-reference" })`.
