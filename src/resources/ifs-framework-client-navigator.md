# IFS Framework Client Navigator

Find the projection (OData service) behind an IFS screen, page, form, menu entry or navigator label. Use when the user names a screen or asks which projection or API to use, and before building a new skill. Never guess a projection name.

Use the `call_protected_api` tool with the endpoints below to search navigator entries by label.

## Base Path

All endpoints below are relative to this base:
```
/main/ifsapplications/projection/v1/ClientNavigator.svc
```

---

## 1. Search Navigator Entries by Label

Finds screens whose navigator label contains the search term. Only the `Label` is searched, and only entries with a usable page type are returned.

**Endpoint:**
```
/main/ifsapplications/projection/v1/ClientNavigator.svc/NavigatorEntries
```

**Method:** GET (read-only)

**Useful fields for `$select`:**
`Label`, `PageType`, `Projection`, `Client`, `Page`

| Field | Meaning |
|-------|---------|
| `Label` | Text shown in the IFS navigator menu, e.g. `Service Contract` |
| `PageType` | Type of entry — see the rules below |
| `Projection` | **The answer** — the projection behind the screen, used as `/main/ifsapplications/projection/v1/{Projection}.svc` |
| `Client` | Client (page model) name |
| `Page` | Page within the client, e.g. `Form`, `List`, `ServiceContractTree` |

**PageType rules:**

| PageType | Meaning | Use? |
|----------|---------|------|
| `/Page` | Normal screen (form, list, …) | Yes — projection is exact |
| `/Tree` | Tree / structure screen | Yes — projection is exact |
| `/Internal` | Screen opened with a preset context (`Page` holds a full route) | Yes — projection is exact |
| `/Assistant` | Assistant / wizard | Yes, but **warn the user** (see Workflow step 5) |
| `null` | Navigator menu folder | No — projection is a `*Navigator` menu projection |
| `/Lobby` | Lobby page | No — projection is a `*Navigator` menu projection |

**Examples:**

Search by full term (default). Lowercase the term; if it contains a single quote, double it (`'` becomes `''`):
```
/main/ifsapplications/projection/v1/ClientNavigator.svc/NavigatorEntries?$filter=contains(tolower(Label),'{term}') and (PageType eq '/Page' or PageType eq '/Tree' or PageType eq '/Internal' or PageType eq '/Assistant')&$select=Label,PageType,Projection,Client,Page&$count=true&$top=25
```

Find the projection for "Service Contract":
```
/main/ifsapplications/projection/v1/ClientNavigator.svc/NavigatorEntries?$filter=contains(tolower(Label),'service contract') and (PageType eq '/Page' or PageType eq '/Tree' or PageType eq '/Internal' or PageType eq '/Assistant')&$select=Label,PageType,Projection,Client,Page&$count=true&$top=25
```

Fallback when the full term returns nothing — one `contains` per word of the term (add more words the same way):
```
/main/ifsapplications/projection/v1/ClientNavigator.svc/NavigatorEntries?$filter=contains(tolower(Label),'{word1}') and contains(tolower(Label),'{word2}') and (PageType eq '/Page' or PageType eq '/Tree' or PageType eq '/Internal' or PageType eq '/Assistant')&$select=Label,PageType,Projection,Client,Page&$count=true&$top=25
```

**Response shape:**
```json
{
  "@odata.count": 7,
  "value": [
    {
      "Label": "Service Contract",
      "PageType": "/Tree",
      "Projection": "ServiceContractHandling",
      "Client": "ServiceContract",
      "Page": "ServiceContractTree"
    }
  ]
}
```

---

## Recommended Workflows

### What projection does screen X use?

1. Run the default search with the user's term.
2. If there are no results, run the fallback search with all words. If still empty, retry with the most distinctive single word.
3. **Deduplicate by `Projection`** — the same screen often appears under several menu folders.
4. **Pick the best match.** An exact `Label` match (case-insensitive) wins. Otherwise show the distinct matches as a table of `Label | PageType | Projection | Client / Page` and say which is most likely meant.
5. **If the chosen entry is `/Assistant`**, report the projection and add this warning:
   > "{Label}" is an assistant (wizard). Assistants often call additional projections, actions or virtual entities across their steps, so this projection may not cover the whole flow. For accurate results, record the assistant steps in IFS Cloud and provide a HAR export (DevTools → Network tab → right-click → Save all as HAR with content).
6. **Still no results:** the screen is probably not in the navigator (e.g. a detail page opened from another screen). Say so and suggest the user check Page Info in IFS or provide a HAR export.

### Rules

- Never return a projection from a `null` or `/Lobby` entry.
- Search on `Label` only — do not search `Client`, `Projection` or `Name`.
- Do not use other ClientNavigator endpoints (`GetNavigator`, `LoadNavigator`, `Reference_Navigator`) — they are not needed and return very large results.
- If `@odata.count` exceeds 25, ask the user to narrow the term rather than paging through everything.

For OData query syntax, use `get_api_guide({ guide: "ifs-common-odata-reference" })`.
