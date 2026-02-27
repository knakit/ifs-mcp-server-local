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

Connecting an AI assistant to an ERP system like IFS usually means writing custom code for every endpoint — work that requires developers who understand both the API and the AI framework. This server takes a different approach.

Instead of code, you teach Claude using **skills** — plain markdown files that describe how a specific part of IFS works: which endpoints to call, what fields matter, and what the data means in business terms. Claude reads the skill and figures out the rest.

**Anyone who knows their way around IFS can create a skill.** No coding required. You either record your workflow in the browser or point Claude at the projection's OpenAPI spec, answer a few questions about what each step means, and the skill is written and saved automatically.

---

## How It Works

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

Skills are plain `.md` files. Share them with colleagues via a URL. Import with one command. The server ships with a built-in skill for IFS OData queries — everything else you build yourself, from your own workflows.

---

## Quick Start

Download the latest `ifs-mcp-server.mcpb` from [GitHub Releases](https://github.com/knakit/ifs-mcp-server-local/releases) and install it in Claude Desktop:

> **[Refer the installation guide →](docs/getting-started/INSTALLATION.md)** — OAuth client setup, configuration, first authentication, and building your first skill.

---

## Documentation

### Getting Started
| Document | What's in it |
|----------|--------------|
| [Installation](docs/getting-started/INSTALLATION.md) | Step-by-step setup: OAuth client, extension install, first authentication |
| [Configuration](docs/getting-started/CONFIGURATION.md) | Skills directory, multiple environments, advanced options |

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

Built with the help of [Claude Code](https://claude.ai/claude-code).
