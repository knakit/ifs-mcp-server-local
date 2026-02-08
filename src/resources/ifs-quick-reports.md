# IFS Quick Reports API Guide

Use the `call_protected_api` tool with the endpoints below to work with IFS Quick Reports.
All endpoints use **GET** method.

## 1. Search Quick Reports

Find reports by their description text.

**Endpoint:**
```
/main/ifsapplications/projection/v1/QuickReportHandling.svc/QuickReportSet
```

**OData Query Parameters:**
- `$filter` - Filter expression (see OData syntax below)
- `$select` - Fields to return (default: `QuickReportId,Description`)
- `$orderby` - Sort order (e.g., `QuickReportId asc`)
- `$top` - Max results
- `$skip` - Skip for pagination

**Search by description (case-insensitive):**
```
/main/ifsapplications/projection/v1/QuickReportHandling.svc/QuickReportSet?$filter=((startswith(tolower(Description),'session stats')))&$select=QuickReportId,Description&$top=10
```

> Important: Use double parentheses `((...))` around filter expressions. No space after comma in `startswith(tolower(Description),'text')`.

**Response shape:**
```json
{ "value": [{ "QuickReportId": "12345", "Description": "Session Stats Report" }] }
```

## 2. List Report Categories

List categories used to organize reports.

**Endpoint:**
```
/main/ifsapplications/projection/v1/QuickReportHandling.svc/ReportCategorySet
```

**Supports the same OData parameters** as Search Quick Reports (`$filter`, `$select`, `$orderby`, `$top`, `$skip`).

**Example:**
```
/main/ifsapplications/projection/v1/QuickReportHandling.svc/ReportCategorySet?$orderby=CategoryId asc&$top=20
```

**Response shape:**
```json
{ "value": [{ "CategoryId": "SALES", "Description": "Sales Reports" }] }
```

## 3. Get Report Parameters

Get the required parameters before executing a report.

**Endpoint:**
```
/main/ifsapplications/projection/v1/QuickReports.svc/GetParameters(ReportId='REPORT_ID')
```

**Example:**
```
/main/ifsapplications/projection/v1/QuickReports.svc/GetParameters(ReportId='12345')
```

> Note: The ReportId value must be wrapped in single quotes.

**Response shape:**
```json
{ "value": [{ "ParameterName": "CustomerNo", "DataType": "STRING" }] }
```

## 4. Execute Quick Report

Run a report with parameters and get results.

**Endpoint:**
```
/main/ifsapplications/projection/v1/QuickReports.svc/QuickReport_REPORT_ID(Param1='Value1',Param2='Value2')
```

- The Report ID is appended after `QuickReport_` in the path
- Parameters go inside parentheses as `Key='Value'` pairs, comma-separated
- String values must be wrapped in single quotes
- Numeric values are passed without quotes

**Example:**
```
/main/ifsapplications/projection/v1/QuickReports.svc/QuickReport_12345(CustomerNo='1001',DateFrom='2024-01-01')
```

**Example with no parameters:**
```
/main/ifsapplications/projection/v1/QuickReports.svc/QuickReport_12345()
```

**Response shape:**
```json
{ "value": [{ "Column1": "...", "Column2": "..." }] }
```

## Recommended Workflow

1. **Search** for the report by description using endpoint #1
2. **Get parameters** for the found report using endpoint #3
3. **Execute** the report with the required parameters using endpoint #4

> Before executing, consider adding `$count=true` to check the result size. If results exceed 10 records, confirm with the user before fetching all data.

For OData query syntax, use `get_api_guide({ guide: "ifs-odata-reference" })`.
