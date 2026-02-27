# IFS MCP Server

[![MCP](https://badge.mcpx.dev?type=server)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![IFS Cloud](https://img.shields.io/badge/IFS_Cloud-OAuth_2.0-orange.svg)](https://www.ifs.com/)
[![Download](https://img.shields.io/github/v/release/knakit/ifs-mcp-server-local?label=download&logo=github)](https://github.com/knakit/ifs-mcp-server-local/releases/latest)

Connect Claude to your IFS Cloud instance and interact with your ERP through natural conversation.

---

## The Idea

What if you could automate your IFS Cloud workflows without buying anything extra? No new subscriptions, no new platforms, no developers needed.

Install the extension, teach Claude the skills, and let it handle the repetitive queries, lookups, and data exports — all from a conversation. Think of it as a coworker who never gets tired of the repetitive stuff.

The best part? You stay in control. You decide what the agent knows, how it behaves, and what it can do — the possibilities are only limited by your imagination.

![IFS MCP Server Demo 1](/docs/images/ifs-demo-skills-summary.gif)

![IFS MCP Server Demo 2](/docs/images/ifs-demo-customer-search.gif)

---

## How It Works

The MCP server acts as the bridge between the **skills** and IFS Cloud. In order to make the tool useful, you need to create the skills so Claude can use them to call IFS endpoints to perform the work.

> Skills are the brain of the agent. More skills, more things you can do!

There are a few ways of creating a skill:
* **Using the IFS projection** — Just state the IFS projection and Claude will find the OpenAPI spec for it and draft the skill for you. Once the skill is created, you can query anything in that projection through conversation. This is typically good for basic data projections.
* **Using a recorded flow** — If you want to handle more complex flows that involve several steps and switching between multiple projections (e.g. Create a Work Task → Assign Work → Start Work), record the flow and import it into Claude. Claude will extract the steps and build a skill file from the network calls.
* **Import a skill** — Import an existing skill `.md` file via URL or by uploading a local file.

```
DEFINE  →  Record a browser workflow (.har) for transactional flows, or fetch a projection's
           OpenAPI spec for master data (customers, suppliers, parts, etc.)
  ↓
REFINE  →  Claude analyses what it found and asks you to explain each step in plain language
  ↓
MAKE    →  Claude drafts the skill file and saves it — available immediately
  ↓
USE     →  Ask Claude anything covered by the skill. It knows exactly how to query IFS.
```

Share your awesome skills in [IFS MCP Skills](https://github.com/knakit/ifs-mcp-skills) so others can use them!

---

## Quick Start

Download the latest `ifs-mcp-server.mcpb` from [GitHub Releases](https://github.com/knakit/ifs-mcp-server-local/releases) and install it in Claude Desktop:

> **[See the installation guide →](docs/getting-started/INSTALLATION.md)** — OAuth client setup, configuration, first authentication, and building your first skill.

---

## Documentation

### Getting Started
| Document | What's in it |
|----------|--------------|
| [Installation](docs/getting-started/INSTALLATION.md) | Step-by-step setup: OAuth client, extension install, first authentication |
| [Configuration](docs/getting-started/CONFIGURATION.md) | Skills directory setup and security notes |

### Guides
| Document | What's in it |
|----------|--------------|
| [Skill Authoring](docs/guides/SKILL_AUTHORING.md) | How to build, update, and share skills — HAR recordings and OpenAPI specs |

### Reference
| Document | What's in it |
|----------|--------------|
| [Tools & Prompts](docs/reference/TOOLS.md) | Full reference for all tools and prompts |
| [Architecture](docs/reference/ARCHITECTURE.md) | System design and component overview |

### Community
| Document | What's in it |
|----------|--------------|
| [Contributing](CONTRIBUTING.md) | How to contribute skills, report bugs, or develop the server |
| [Security](SECURITY.md) | Data handling, responsible use, and vulnerability reporting |

---

Built with the help of [Claude Code](https://claude.ai/claude-code). Shared with love for the IFS Community 💜