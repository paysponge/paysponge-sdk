# Claude Integration

The SDK provides two ways to give Claude access to wallet tools: **MCP** (for Claude Agent SDK) and **Direct Tools** (for raw Anthropic SDK).

## MCP (Claude Agent SDK)

Use `wallet.mcp()` to get the MCP server configuration:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import { SpongeWallet } from "@paysponge/sdk";

const wallet = await SpongeWallet.connect();

for await (const msg of query({
  prompt: "Check my wallet balance on Base",
  options: {
    mcpServers: {
      wallet: wallet.mcp(),
    },
  },
})) {
  console.log(msg);
}
```

`wallet.mcp()` returns:

```typescript
{
  url: "https://api.wallet.paysponge.com/mcp",
  headers: {
    Authorization: "Bearer sponge_test_..."
  }
}
```

## Direct Tools (Anthropic SDK)

Use `wallet.tools()` for direct integration with the Anthropic messages API:

Tool execution calls the REST API endpoints directly (no MCP JSON-RPC).

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { SpongeWallet } from "@paysponge/sdk";

const anthropic = new Anthropic();
const wallet = await SpongeWallet.connect();
const tools = wallet.tools();

// Send tools to Claude
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  tools: tools.definitions,
  messages: [{ role: "user", content: "Check my balance on Base" }],
});

// Execute tool calls
for (const block of response.content) {
  if (block.type === "tool_use") {
    const result = await tools.execute(block.name, block.input);
    console.log(result);
  }
}
```

## Available Tools

| Tool | Description | Input |
|------|-------------|-------|
| `get_balance` | Get wallet balances | `{ chain?, allowedChains?, onlyUsdc? }` |
| `evm_transfer` | Transfer on EVM chains | `{ chain, to, amount, currency }` |
| `solana_transfer` | Transfer on Solana | `{ chain, to, amount, currency }` |
| `solana_swap` | Swap tokens via Jupiter | `{ chain, inputToken, outputToken, amount, slippageBps? }` |
| `get_solana_tokens` | List SPL tokens | `{ chain }` |
| `search_solana_tokens` | Search Jupiter tokens | `{ query, limit? }` |
| `get_transaction_status` | Check tx status | `{ txHash, chain }` |
| `get_transaction_history` | Get tx history | `{ limit?, chain? }` |
<!-- | `sponge` | Call paid APIs via x402 | `{ task, ... }` | (temporarily disabled) -->
| `create_x402_payment` | Create x402 payment | `{ chain, to, amount, ... }` |

## Tool Execution Results

All tools return a discriminated union:

```typescript
// Success
{ status: "success", data: { ... } }

// Error
{ status: "error", error: "Error message" }
```
