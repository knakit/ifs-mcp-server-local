# IFS Customer Management

Use the `call_protected_api` tool with the endpoints below to create and query customers in IFS Cloud.

---

## Projection

All endpoints are under:
```
/main/ifsapplications/projection/v1/CustomerHandling.svc
```

---

## Create a Customer

**Endpoint:** `POST /main/ifsapplications/projection/v1/CustomerHandling.svc/CustomerInfoSet`

**Required fields:**

| Field | Type | Notes |
|-------|------|-------|
| `Name` | string | Customer name |
| `CreationDate` | date (YYYY-MM-DD) | Today's date or specified date |
| `Country` | string | ISO 2-letter country code e.g. `"SE"`, `"GB"`, `"US"` |
| `CountryCode` | string | Same as Country |
| `DefaultLanguage` | string | ISO language code e.g. `"en"`, `"sv"` |
| `PartyType` | string | Always `"Customer"` |
| `DefaultDomain` | boolean | Always `true` |

**Optional fields:**

| Field | Type | Notes |
|-------|------|-------|
| `CustomerCategory` | string | `"Customer"` (default) or `"Prospect"` |
| `OneTime` | boolean | `false` (default) — set `true` for one-time customers |
| `B2bCustomer` | boolean | `false` (default) |
| `ValidDataProcessingPurpose` | boolean | `false` (default) |
| `IdentifierRefValidation` | string | `"None"` (default) |
| `AssociationNo` | string | Organisation/VAT registration number |
| `CorporateForm` | string | Legal form of the company |
| `MainRepresentative` | string | Sales representative ID |
| `CustomerTaxUsageType` | string | Tax usage type code |

**Example request body:**
```json
{
  "Name": "Acme Corporation",
  "CreationDate": "2026-02-21",
  "Country": "SE",
  "CountryCode": "SE",
  "DefaultLanguage": "en",
  "PartyType": "Customer",
  "DefaultDomain": true,
  "CustomerCategory": "Customer",
  "OneTime": false,
  "B2bCustomer": false,
  "ValidDataProcessingPurpose": false,
  "IdentifierRefValidation": "None"
}
```

**Example call:**
```
call_protected_api(
  endpoint="/main/ifsapplications/projection/v1/CustomerHandling.svc/CustomerInfoSet",
  method="POST",
  body={ ... }
)
```

**Success response:** HTTP 201 with the created customer record, including the auto-assigned `CustomerId`.

---

## Get a Customer by ID

**Endpoint:** `GET /main/ifsapplications/projection/v1/CustomerHandling.svc/CustomerInfoSet(CustomerId='{id}')`

**Example:**
```
call_protected_api(
  endpoint="/main/ifsapplications/projection/v1/CustomerHandling.svc/CustomerInfoSet(CustomerId='10041988')",
  method="GET"
)
```

Useful `$select` fields: `CustomerId, Name, AssociationNo, CustomerCategory, OneTime, B2bCustomer, Country, CountryCode, DefaultLanguage, CreationDate, IdentifierRefValidation, MainRepresentative`

---

## Search / List Customers

**Endpoint:** `GET /main/ifsapplications/projection/v1/CustomerHandling.svc/CustomerInfoSet`

**OData filters:**

| Goal | Query parameter |
|------|----------------|
| Filter by name | `$filter=contains(Name,'Acme')` |
| Filter by country | `$filter=Country eq 'SE'` |
| Filter by category | `$filter=CustomerCategory eq 'Customer'` |
| Limit results | `$top=10` |
| Select fields | `$select=CustomerId,Name,Country,CreationDate` |

**Example:**
```
call_protected_api(
  endpoint="/main/ifsapplications/projection/v1/CustomerHandling.svc/CustomerInfoSet?$filter=contains(Name,'Acme')&$select=CustomerId,Name,Country,CreationDate&$top=10",
  method="GET"
)
```

---

## Validate Country Code

Before creating a customer, you can validate a country code:

**Endpoint:** `GET /main/ifsapplications/projection/v1/CustomerHandling.svc/GetCountryCode(CountryCode=IfsApp.CustomerHandling.Lookup_IsoCountry'{code}')`

**Example:**
```
call_protected_api(
  endpoint="/main/ifsapplications/projection/v1/CustomerHandling.svc/GetCountryCode(CountryCode=IfsApp.CustomerHandling.Lookup_IsoCountry'SE')",
  method="GET"
)
```

Returns the resolved country code string.

---

## Workflow: Create a New Customer

1. **Collect required info** from the user: customer name, country, language, and optionally category, VAT number, etc.
2. **POST to CustomerInfoSet** with the required fields.
3. **Return the new `CustomerId`** from the 201 response to the user, along with a confirmation summary.

If a field is not provided by the user, apply these defaults:

| Field | Default |
|-------|---------|
| `DefaultLanguage` | `"en"` |
| `CustomerCategory` | `"Customer"` |
| `OneTime` | `false` |
| `B2bCustomer` | `false` |
| `ValidDataProcessingPurpose` | `false` |
| `IdentifierRefValidation` | `"None"` |
| `DefaultDomain` | `true` |
| `PartyType` | `"Customer"` |
| `CreationDate` | today's date in `YYYY-MM-DD` format |

---

## Reference: Country Codes

| Country | Code |
|---------|------|
| Sweden | SE |
| United Kingdom | GB |
| United States | US |
| Germany | DE |
| France | FR |
| Norway | NO |
| Denmark | DK |
| Finland | FI |
| Netherlands | NL |
| Spain | ES |

---

## Reference: Language Codes

| Language | Code |
|----------|------|
| English | en |
| Swedish | sv |
| German | de |
| French | fr |
| Norwegian | no |
| Danish | da |
