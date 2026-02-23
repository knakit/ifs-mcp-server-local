# How to Build an IFS Skill

A **skill** is a small instruction file that teaches the AI assistant how to work with a specific part of IFS Cloud. Without a skill, the AI doesn't know which screens, fields, or API calls are involved in a particular workflow. With one, you can simply say things like *"show me all open customer orders"* or *"create a purchase order for this supplier"* and the assistant handles the rest.

This guide walks you through creating a skill from scratch — no technical knowledge required.

---

## What You Need

- Access to your IFS Cloud instance in a browser
- **Google Chrome** or **Microsoft Edge** (recommended — both have the same developer tools)
- Firefox also works, but the steps differ slightly
- Claude Desktop with the IFS MCP server connected

---

## Which Method Should I Use?

There are two ways to build a skill. Choose the one that fits your workflow:

| Method | Best for | What you provide |
|--------|----------|-----------------|
| **HAR recording** | Transactional workflows — orders, approvals, multi-step processes | A `.har` file captured from browser DevTools |
| **OpenAPI spec** | Master data — customers, suppliers, parts, sites | The projection service name (live fetch) or a downloaded spec file |

**Use HAR** when the workflow involves specific sequences of actions (e.g. create header → add lines → release order). The recording captures exactly what your users do and with which fields.

**Use OpenAPI** when you want to document the full CRUD surface of a master data entity and don't need to record a specific workflow first. The spec tells you every available operation and every field.

---

## How It Works

**HAR path:**
```
1. CAPTURE  →  Record your actions in IFS using browser developer tools (saves as a .har file)
2. REFINE   →  Claude analyses what it found and asks you to explain each step in plain language
3. MAKE     →  Claude drafts the skill file and saves it automatically
4. USE      →  The skill is immediately available — ask Claude to use it
```

**OpenAPI path:**
```
1. FETCH    →  Point Claude at a projection's OpenAPI spec — live fetch or a local file
2. REFINE   →  Claude analyses the spec and asks which operations you need and what fields mean
3. MAKE     →  Claude drafts the skill file and saves it automatically
4. USE      →  The skill is immediately available — ask Claude to use it
```

---

## Step 1 — Open IFS Cloud in Your Browser

Open Chrome or Edge and navigate to your IFS Cloud instance. Log in as you normally would.

**Important:** Use a fresh browser session. If you have many IFS tabs open, close the ones you don't need. This keeps your recording clean.

---

## Step 2 — Open Developer Tools

Developer tools let the browser record which API calls IFS makes in the background when you perform actions.

**To open developer tools:**

- Press **F12** on your keyboard
  *or*
- Press **Ctrl + Shift + I** (Windows) / **Cmd + Option + I** (Mac)
  *or*
- Right-click anywhere on the page → click **Inspect**

A panel will appear — either at the bottom or the right side of your browser window. This is normal.

---

## Step 3 — Set Up the Network Tab

The **Network** tab records API traffic. You need to get it ready before performing your workflow.

1. Click the **Network** tab at the top of the developer tools panel

2. **Clear any existing entries** — click the 🚫 (circle with a line through it) button, or press **Ctrl + L** while the Network tab is focused. You should see the list go blank.

3. **Filter to show only API calls** — in the filter bar (it may say *Filter* or show a search icon), click **XHR** or **Fetch** if those options are available. This hides images, fonts, and scripts from the view, making it easier to see what matters.
   > If you don't see XHR/Fetch filter buttons, leave the filter blank — the export will still work.

4. Make sure **recording is active** — you should see a red circle (●) at the top left of the Network panel. If it's grey, click it to start recording.

Your setup should now look something like this:
```
[ ● ] [ 🚫 ] [ Filter: XHR ] ...
(empty list — ready to record)
```

---

## Step 4 — Perform Your Workflow in IFS

Now do exactly the actions you want to teach the AI. Be deliberate and focused:

**Good approach:**
- Navigate to the screen you care about (e.g. Customer Orders)
- Perform the specific actions (search, open a record, create, update)
- Stop as soon as you're done

**Avoid:**
- Clicking around unrelated screens
- Refreshing the page multiple times
- Opening other IFS modules you don't need
- Logging out and back in during the recording

**Examples of good single-workflow recordings:**
- Opening the Customer Order list, searching by customer, and opening one order
- Creating a new Purchase Order from start to finish
- Running a Quick Report and downloading the results
- Updating a supplier address

The more focused your recording, the better the resulting skill.

---

## Step 5 — Export the HAR File

Once you've finished your workflow:

1. In the Network tab, **right-click on any entry** in the list
2. Select **"Save all as HAR with content"**

   > In some browsers it may say *"Export HAR"* or *"Download HAR"*

3. Choose where to save the file. Give it a meaningful name like `customer-orders.har` or `purchase-order-create.har`

4. Click **Save**

That's your recording — a `.har` file containing everything IFS did in the background while you worked.

---

## Tips to Keep the HAR File Small

HAR files can get large if you're not careful. Large files take longer to process and can slow down skill creation. Here's how to keep them manageable:

### Before you record
- ✅ **Clear the network log first** (the 🚫 button) — this removes any requests from when you were setting up
- ✅ **Navigate to the right screen first, then clear** — open the IFS page you need, clear the log, *then* start your workflow actions
- ✅ **Close other IFS tabs** — each tab can generate background requests that pollute your recording

### During recording
- ✅ **Be quick and purposeful** — don't linger or scroll unnecessarily between steps
- ✅ **Do one workflow per recording** — don't try to capture "everything at once" in a single session
- ✅ **Use small datasets** — if testing a search, search for something that returns a handful of results, not thousands

### Common causes of large HAR files
| Cause | Impact | Fix |
|-------|--------|-----|
| Long browsing session before clearing | Many MB of unrelated requests | Always clear before starting |
| Loading a list with 10,000+ records | Response bodies become huge | Use a filter to limit results |
| Multiple page navigations | Duplicated static assets | Navigate once, then clear, then act |
| Staying on the page for a long time | Background polling requests accumulate | Export promptly after your workflow |

### File size guide
| HAR file size | What it means | Expected outcome |
|---------------|---------------|-----------------|
| < 2 MB | Clean, focused recording | Fast processing, clean skill |
| 2–10 MB | Typical session with some noise | Good — Claude will filter the extras |
| 10–30 MB | Long session or large data | Slower processing, still works |
| > 30 MB | Very long session or large responses | Consider re-recording more focused |
| > 100 MB | Multiple long sessions or huge data | Break into separate recordings |

> The IFS skill builder automatically ignores images, CSS, JavaScript, and non-IFS API calls — so extra noise doesn't break anything, it just slows down processing.

---

## Step 6 — Build the Skill with Claude

Now hand the HAR file to Claude.

1. Open **Claude Desktop**

2. Click the **+** icon (or the attachment/prompt button) in the chat input area

3. Select **build_ifs_guide** from the list of prompts

4. When asked, enter the **full file path** to your HAR file, for example:
   - Windows: `C:\Users\YourName\Downloads\customer-orders.har`
   - Mac/Linux: `/Users/yourname/Downloads/customer-orders.har`

5. Claude will read the recording and show you a summary of what it found — something like:
   ```
   Found 3 IFS API operations across 1 projection service:
   - GET CustomerOrderSet (4 calls)
   - GET CustomerOrderLineSet (2 calls)
   - POST CustomerOrder_SetReleased [action] (1 call)
   ```

6. Claude will then ask you questions about each operation:
   - *"What does GET CustomerOrderSet represent in your workflow?"*
   - *"Should I include this filter pattern as an example?"*
   - *"What does Objstate = 'Released' mean in business terms?"*

   Answer in plain language — your own words are what make the skill useful.

---

## Step 7 — Review and Save

After the Q&A:

1. Claude drafts the skill file and shows it to you

2. Review it — check that the descriptions make sense, the examples look right, and nothing sensitive is included (real order numbers, customer IDs, etc. should be replaced with placeholders)

3. Claude will ask: *"What should the filename be?"* — give it a short descriptive name, for example:
   - `ifs-customer-orders`
   - `ifs-purchase-orders`
   - `ifs-supplier-management`

4. Claude saves the file immediately. The skill is **available right away** — no restart needed.

---

## Skill File Best Practices

Once created, your skill lives as a `.md` file in the server's resources folder. Here's how to keep them healthy:

### Size recommendations
| Skill file size | Assessment |
|-----------------|------------|
| < 5 KB | Ideal — focused, one projection |
| 5–15 KB | Good — multi-operation skills |
| 15–30 KB | Consider splitting into two files |
| > 30 KB | Too large — split by operation group |

### Keep skills focused
One skill = one IFS projection or one business area. Don't try to cram "everything about purchasing" into one file.

**Good:** `ifs-purchase-orders.md` covers creating and managing purchase orders
**Too broad:** `ifs-procurement.md` covers purchase orders, suppliers, quotes, receiving, invoices, and approvals

Split large workflows across multiple files. Users load one skill at a time — smaller files use less of Claude's context window.

### Naming convention
Use the format `ifs-[module]-[area].md`:
- `ifs-sales-customer-orders.md`
- `ifs-procurement-purchase-orders.md`
- `ifs-procurement-supplier-invoices.md`
- `ifs-manufacturing-work-orders.md`
- `ifs-common-quick-reports.md`

Common modules: `common`, `procurement`, `sales`, `manufacturing`, `maintenance`, `finance`, `inventory`, `projects`, `hr`

Avoid spaces and special characters. Hyphens only.

### What a good skill file contains
- ✅ The base URL path for the projection
- ✅ Each operation with a plain-language description
- ✅ The most useful fields for `$select`
- ✅ 2–3 realistic filter examples
- ✅ Common workflows that combine multiple calls
- ✅ Status/state values explained in business terms

### What to leave out
- ❌ Real customer numbers, order numbers, or dates (use placeholders like `CUST-001`, `PO-10001`)
- ❌ Every possible field — only include what's actually used
- ❌ Rarely-used filter patterns
- ❌ Internal technical details that aren't needed to make API calls

---

## Alternative: Building from OpenAPI Spec

Use this approach for master data projections (customers, suppliers, parts) where you want the full field schema and all CRUD operations without recording a browser session first.

### Option A — Live fetch (easiest)

You just need to know the projection service name. Claude fetches the spec using your active IFS session.

1. Open **Claude Desktop** (make sure you are authenticated to IFS — run `get_session_info` to check)
2. Click the **+** icon and select **build_ifs_guide** from the prompt list
3. In the **`projection_name`** field, enter the service name — for example:
   - `CustomerHandling`
   - `SupplierHandling`
   - `InventoryPartHandling`
4. Claude will fetch the spec, extract entity sets, operations, and field schemas, and present a summary
5. Claude asks clarifying questions — which operations do your users need? What do field names mean? Any status values to explain?
6. Claude drafts and saves the skill

> **Tip:** Not sure of the service name? Look at the URL in browser DevTools when using that IFS screen — it will contain `/projection/v1/ServiceName.svc/`.

### Option B — Local spec file

If you prefer to inspect the spec first or work offline:

1. Open your IFS Cloud instance in a browser
2. Navigate to this URL (replace `CustomerHandling` with your projection):
   ```
   https://your-instance.ifs.cloud/main/ifsapplications/projection/v1/CustomerHandling.svc/$openapi?V2
   ```
3. Save the page as a `.json` file (in Chrome: **Ctrl+S**, save as *Webpage, Single File* or use the browser's save option for plain text)
4. In Claude Desktop, select **build_ifs_guide** and provide the file path in the **`openapi_file_path`** field
5. Claude parses the file and proceeds as in Option A

### What the OpenAPI workflow covers

Claude will ask you:
- Which entity sets are relevant to your users (if the projection has many)
- What each entity represents in business terms
- What non-obvious field names mean
- Which required fields a user always provides vs. which should be defaulted
- Any enum or status values worth documenting
- Multi-step workflows that combine operations

The resulting skill documents required/optional fields clearly, includes realistic example values, and suggests common `$filter` patterns — ready to use immediately.

---

## Updating an Existing Skill

If IFS changes or you discover better patterns, you can update a skill:

1. Run `build_ifs_guide` again — with a new HAR file, a new spec file, or using live fetch
2. When asked for the filename, use the **same name as the existing skill**
3. Claude will show you a summary of what changed (sections added, fields updated, examples modified)
4. The update is saved immediately

---

## Sharing Skills

Skills are plain `.md` files — share them like any other document.

### Community skills repository

The [ifs-mcp-skills](https://github.com/knakit/ifs-mcp-skills) repository is the home for shared IFS skills. Browse it to find ready-made skills for common IFS workflows, or contribute your own.

To import a skill directly from the repository:
```
import_skill({ source: "https://raw.githubusercontent.com/knakit/ifs-mcp-skills/main/ifs-sales-customers.md" })
```
The skill is available immediately after import — no restart needed.

### Sharing your own skills

1. Find the file in your skills directory (`SKILLS_DIR` if configured, otherwise `build/resources/`)
2. Upload it to GitHub or any file host
3. Share the raw download URL — recipients import it with `import_skill`

To contribute a skill to the community repository, open a pull request at [github.com/knakit/ifs-mcp-skills](https://github.com/knakit/ifs-mcp-skills).

### Skills work across dev and prod

If you're running both a dev and a production environment (see [CONFIGURATION.md](CONFIGURATION.md)), point both server registrations to the same `SKILLS_DIR`. Skills you create or import are instantly available in both environments — you only need to build and maintain one set of skills.

When using a skill against a specific environment, just tell Claude which server to use:
- *"Using ifs-dev, check if customer order 100012 is released"*
- *"Using ifs-prod, export all open purchase orders to CSV"*

---

## Troubleshooting

**"No IFS API operations found in the HAR file"**
The recording didn't capture IFS projection API calls. Make sure you:
- Were logged in to IFS Cloud (not just the login page)
- Actually performed actions (not just loaded a page)
- The Network tab was recording (red dot was active)

**"HAR file too large to process"**
Re-record with a more focused workflow. Clear the network log first, do only the specific actions, and export immediately.

**"The skill doesn't seem to know about field X"**
The field wasn't in your recording's `$select` list. Re-record the workflow and make sure the IFS screen is showing that field (IFS only returns selected fields in API responses).

**"Claude is still guessing at endpoints even with the skill"**
Make sure you're using `get_api_guide` to load the skill first. Claude doesn't automatically read skills — it needs to be told which guide to consult.

**"The HAR file path isn't working"**
Use the full absolute path with no quotes:
- ✅ `C:\Users\John\Downloads\my-recording.har`
- ❌ `"C:\Users\John\Downloads\my-recording.har"` (no quotes needed)
- ❌ `my-recording.har` (not a full path)

**"Live fetch says I'm not authenticated"**
Run `get_session_info` first. If it shows no active session, run `start_oauth` to authenticate, then retry `build_ifs_guide` with `projection_name`.

**"The OpenAPI spec file failed to parse"**
Make sure the file is a valid JSON file (not HTML). When saving from a browser, use the browser's raw text option or copy-paste the JSON content into a `.json` file. The spec must be Swagger 2.0 or OpenAPI 3.0 JSON format.

**"The projection name doesn't look right"**
Check the URL in browser DevTools when using that IFS screen. It will contain something like `/projection/v1/CustomerHandling.svc/` — the part before `.svc` is the projection name to use.

---

## Quick Reference

| Task | How |
|------|-----|
| Open developer tools | F12 |
| Clear network log | 🚫 button in Network tab |
| Export HAR file | Right-click any entry → Save all as HAR with content |
| Build a skill from HAR | `build_ifs_guide` with `har_file_path=...` |
| Build a skill from live spec | `build_ifs_guide` with `projection_name=CustomerHandling` |
| Build a skill from spec file | `build_ifs_guide` with `openapi_file_path=...` |
| Update a skill | Re-run `build_ifs_guide`, use the same filename |
| Import a shared skill | `import_skill({ source: "https://..." })` |
| List available skills | `get_api_guide()` (no arguments) |
| Load a skill | `get_api_guide({ guide: "ifs-customer-orders" })` |
