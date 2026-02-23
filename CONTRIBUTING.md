# Contributing to IFS MCP Server

Thank you for your interest in contributing. There are three main ways to help:

1. **Share a skill** — Build a skill for an IFS workflow and submit it so others can use it
2. **Report a bug** — Something isn't working as expected
3. **Suggest an improvement** — An idea for a new feature or a better way to do something

---

## Sharing a Skill

Skills are the most valuable contribution you can make. Every skill you share saves someone else hours of figuring out which IFS endpoints to use and what the fields mean.

### What makes a good contributed skill

- **Focused** — one IFS projection or business area per file (Customer Orders, Purchase Orders, Supplier Invoices, etc.)
- **Business-readable** — written in plain language, not just raw API field names
- **Generic** — no real order numbers, customer IDs, or company-specific data. Use placeholders like `CUST-001`, `ORDER-10001`
- **Tested** — you've actually used it to query your IFS instance

See [SKILL_AUTHORING_GUIDE.md](SKILL_AUTHORING_GUIDE.md) for the full process of building a skill from scratch.

### How to submit a skill

1. **Fork this repository** on GitHub

2. **Build your skill** using the `build_ifs_guide` prompt in Claude Desktop, or write it manually following the conventions in existing skills in `src/resources/`

3. **Place your skill file** in `src/resources/` using the naming convention:
   ```
   ifs-[module]-[area].md
   ```
   Where `[module]` is the IFS functional area:

   | Module | Covers |
   |--------|--------|
   | `common` | Shared references (OData syntax, field types, etc.) |
   | `procurement` | Purchase orders, suppliers, quotes, receiving |
   | `sales` | Customer orders, quotations, invoices |
   | `manufacturing` | Work orders, shop orders, parts, BOMs |
   | `maintenance` | Equipment, service orders, fault reporting |
   | `finance` | Supplier invoices, GL, cost centers |
   | `inventory` | Parts, stock, warehouse locations |
   | `projects` | Project management, time reporting |
   | `hr` | Employees, time and attendance |

   Examples: `ifs-procurement-purchase-orders.md`, `ifs-sales-customer-orders.md`, `ifs-manufacturing-work-orders.md`

   If your skill doesn't fit neatly into one module, use the closest match or open a PR and we'll figure it out together.

4. **Review your skill file** against this checklist:
   - [ ] Has a clear `# Heading` that describes the IFS projection
   - [ ] Includes the base URL path for the projection
   - [ ] Explains each operation in plain language
   - [ ] Lists the most useful `$select` fields
   - [ ] Has at least 2–3 realistic filter examples
   - [ ] Status/state values are explained in business terms
   - [ ] No real customer data, order numbers, or company-specific values
   - [ ] File size is under 30KB (split into multiple files if larger)

5. **Open a Pull Request** with:
   - A brief description of the IFS projection the skill covers
   - Which IFS module it belongs to (Manufacturing, Procurement, Sales, etc.)
   - Any known limitations or IFS version-specific notes

### Sharing without a PR

If you'd rather not go through the PR process, you can share your skill by:
- Uploading the `.md` file to a GitHub Gist or any public URL
- Posting the link in a GitHub Issue or Discussion

Others can import it directly with:
```
import_skill({ source: "https://raw.githubusercontent.com/..." })
```

---

## Reporting a Bug

Open an issue at [GitHub Issues](https://github.com/knakit/ifs-mcp-server-local/issues) and include:

**For authentication issues:**
- Your IFS Cloud version (if known)
- Operating system and Node.js version (`node --version`)
- The error message from Claude Desktop or the MCP server

**For skill or API issues:**
- Which skill file you're using
- The `call_protected_api` call that failed (remove any sensitive data)
- The error response

**For build or setup issues:**
- Operating system
- Node.js version (`node --version`)
- The full error output from `npx tsc` or the server startup

A good bug report includes enough detail for someone else to reproduce the problem without access to your IFS instance.

---

## Suggesting an Improvement

Open an issue and label it **enhancement**. Describe:

- What you're trying to do
- What you'd expect the tool to do
- Why the current behaviour doesn't work for your case

No suggestion is too small. If something feels harder than it should be, it's worth raising.

---

## Code Contributions

For bug fixes or small improvements, open a PR with a clear description of what you changed and why.

For larger changes (new tools, architectural changes), open an issue first to discuss the approach before writing code — this avoids wasted effort if the direction doesn't fit the project.

### Setup

```bash
git clone https://github.com/knakit/ifs-mcp-server-local
cd ifs-mcp-server-local
npm install
```

Copy `.env.example` to `.env` and fill in your IFS credentials.

### Build

```bash
# Windows
npx tsc

# macOS / Linux
npm run build
```

### Before submitting a PR

- [ ] `npx tsc` compiles without errors
- [ ] Existing skills in `src/resources/` still load correctly
- [ ] No secrets or credentials in any committed file

---

## Questions

If you're unsure whether something is a bug or just unexpected behaviour, or if you want to check whether a skill idea is a good fit before building it — open a Discussion or Issue. Happy to help.
