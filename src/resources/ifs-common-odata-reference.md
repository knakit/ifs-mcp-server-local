# IFS OData Query Reference

Use this reference when constructing OData query parameters for `call_protected_api` endpoints.

> Important: IFS Cloud requires double parentheses `((...))` around filter expressions. No space after comma in function calls like `startswith(tolower(Field),'text')`.

## Filter Operations

| Operation | Syntax | Example |
|-----------|--------|---------|
| Starts with (case-insensitive) | `((startswith(tolower(Field),'text')))` | `((startswith(tolower(Description),'sales')))` |
| Contains | `contains(Field,'text')` | `contains(Description,'order')` |
| Equals | `Field eq 'value'` | `CategoryId eq 'SALES'` |
| Not equals | `Field ne 'value'` | `Status ne 'CLOSED'` |
| Greater than | `Field gt value` | `Amount gt 1000` |
| Less than | `Field lt value` | `Amount lt 500` |
| AND | `expr1 and expr2` | `Status eq 'OPEN' and Amount gt 100` |
| OR | `expr1 or expr2` | `Status eq 'OPEN' or Status eq 'NEW'` |

## Filtering on Enum Fields

Enum fields (like `Objstate`, `SupplyCode`, `CatalogType`) require the fully qualified type name in the filter value. The format is:

```
Field eq Namespace.EnumType'Value'
```

The namespace follows the pattern `IfsApp.ProjectionName.EnumType`. Each projection guide lists the qualified names for its enum fields.

**Example — filter by order state:**
```
$filter=Objstate eq IfsApp.CustomerOrderHandling.CustomerOrderState'Released'
```

**Example — combine enum filters:**
```
$filter=Objstate eq IfsApp.CustomerOrderHandling.CustomerOrderState'Released' or Objstate eq IfsApp.CustomerOrderHandling.CustomerOrderState'Reserved'
```

> Important: Do NOT use plain string values like `Objstate eq 'Released'` for enum fields — this will return an error. Always use the fully qualified enum format.

## Query Parameters

| Parameter | Syntax | Example |
|-----------|--------|---------|
| Filter | `$filter=expr` | `$filter=((startswith(tolower(Description),'sales')))` |
| Select fields | `$select=F1,F2` | `$select=QuickReportId,Description` |
| Order ascending | `$orderby=Field asc` | `$orderby=QuickReportId asc` |
| Order descending | `$orderby=Field desc` | `$orderby=ModifiedDate desc` |
| Limit results | `$top=N` | `$top=10` |
| Skip results | `$skip=N` | `$skip=20` |
| Count results | `$count=true` | `$count=true` |
