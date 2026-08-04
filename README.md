# mcp-singapore-procurement

Singapore Government Procurement MCP — GeBIZ tender awards (keyless).

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `singapore_search_awards` | Search Singapore government procurement tender awards from the official GeBIZ dataset on data.gov.sg (keyless). Full-text search over awarding agency, supplier name, and tender description. Returns each award with tender number, agency, supplier, description, awarded amount (SGD), award date, and status. Use for questions like "which company won contract X", "how much did agency Y award for Z", or listing recent government contract awards. Omit "query" to page through all awards. Amounts are in Singapore Dollars (SGD). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "singapore-procurement": {
      "url": "https://gateway.pipeworx.io/singapore-procurement/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Singapore Procurement data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
