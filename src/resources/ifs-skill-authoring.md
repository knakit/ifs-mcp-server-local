# IFS Skill Authoring Guide

How to build, format, and save IFS resource guide (skill) files.

Use the `call_protected_api` tool with the endpoints below to interact with IFS Cloud.

---

## Skill file format

Every skill must follow this structure exactly:

```markdown
# [Guide Name]

[1–2 sentence description of what this guide enables.]

Use the `call_protected_api` tool with the endpoints below to [purpose].

## Base Path

All endpoints below are relative to this base:
```
/main/ifsapplications/projection/v1/[ServiceName].svc
```

---

## 1. [Operation Name]

[What this operation does in plain language.]

**Endpoint:**
```
/main/ifsapplications/projection/v1/[ServiceName].svc/[EntitySet]
```

**Method:** GET | POST | PATCH | DELETE

**Useful fields for `$select`:**
`Field1`, `Field2`, `Field3`

**Examples:**

[Business-meaningful label]:
```
[example URL or request body]
```

**Response shape:**
```json
{ "value": [{ ... }] }
```

[Repeat for each operation]

---

## Recommended Workflows

[Numbered multi-step workflows combining calls]

> Before fetching large datasets, add `$count=true` to check result size. If results exceed 10 records, confirm with the user before fetching all data.

For OData query syntax, use `get_api_guide({ guide: "ifs-common-odata-reference" })`.
```

---

## Saving the skill

1. Ask the user: "What should the filename be? Use the format `ifs-[module]-[area]`, e.g. `ifs-sales-customers` — saved as .md". If updating an existing skill, use its current filename.
2. Call `save_skill({ filename: "...", content: "..." })` to save it.
3. Check the result:
   - `action: "created"` — confirm the skill is saved and available via `get_api_guide`. No restart needed.
   - `action: "updated"` — show the `changes` summary so the user can see what changed.
   - Error — report it and ask the user to check the filename or path.
4. After saving, others can import the skill with `import_skill({ source: "HTTPS URL to the .md file" })`.

---

## HAR mode guidelines

When building from a HAR file:

- Work through one projection service at a time
- For each operation (entity set + method), ask the user what it represents in their workflow
- Replace all real data values with realistic placeholders (e.g. `CUST-001`, `PO-10001`, `2024-01-15`)
- Preserve IfsApp enum values exactly as seen — they are structural, not sensitive
- Only include operations and filter patterns the user confirms are useful
- Ask at most 2 questions at a time and use the user's own words in descriptions

---

## OpenAPI mode guidelines

When building from an OpenAPI/Swagger spec (downloaded file or live fetch):

- Not everything in the spec needs to go into the skill — work selectively
- For each relevant entity set, ask the user what it represents in their business
- Derive realistic placeholder values matching field type and maxLength
- Suggest common `$filter` patterns: `contains(Name,'{value}')` for strings, `eq '{value}'` for key fields
- For POST/PATCH: document required fields clearly, list optional fields in a reference table
- Ask about multi-step workflows (e.g. create → validate → link to another entity)
- For enums: list all values with a short explanation (ask the user what each means)
- Ask at most 2 questions at a time and use the user's own words in descriptions
