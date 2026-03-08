# Quickstart: AI Agents

Give your Claude-powered agent its own crypto wallet. This guide gets you from zero to an agent that can check balances and send tokens.

## Prerequisites

- Node.js 18+ or Bun
- An Anthropic API key (for Claude)

## Install

```bash
npm install @paysponge/sdk @anthropic-ai/sdk
```

## 1. Connect a wallet

```typescript
import { SpongeWallet } from "@paysponge/sdk";

const wallet = await SpongeWallet.connect();
```

On first run this opens your browser to log in. After approval, your credentials are cached locally — subsequent runs connect instantly.

For CI or server environments, pass an API key directly:

```typescript
const wallet = await SpongeWallet.connect({
  apiKey: process.env.SPONGE_API_KEY,
});
```

## 2. Choose your integration path

The SDK gives Claude access to wallet operations in two ways. Pick the one that matches your stack.

### Option A: MCP (Claude Agent SDK)

The simplest path. One line hands Claude a full wallet toolset via MCP.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import { SpongeWallet } from "@paysponge/sdk";

const wallet = await SpongeWallet.connect();

for await (const msg of query({
  prompt: "What's my wallet balance across all chains?",
  options: {
    mcpServers: {
      wallet: wallet.mcp(),
    },
  },
})) {
  console.log(msg);
}
```

`wallet.mcp()` returns the MCP server URL and auth headers — Claude Agent SDK handles the rest.

### Option B: Direct tools (Anthropic SDK)

For full control over the agentic loop. You pass tool definitions to Claude and handle execution yourself.

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { SpongeWallet } from "@paysponge/sdk";

const client = new Anthropic();
const wallet = await SpongeWallet.connect();
const tools = wallet.tools();

// Initial message
let messages: Anthropic.MessageParam[] = [
  { role: "user", content: "Check my balance on Base and Solana" },
];

// Agentic loop
while (true) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    tools: tools.definitions,
    messages,
  });

  // Collect text and tool uses
  const toolResults: Anthropic.MessageParam[] = [];

  for (const block of response.content) {
    if (block.type === "text") {
      console.log(block.text);
    }
    if (block.type === "tool_use") {
      const result = await tools.execute(block.name, block.input);
      toolResults.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          },
        ],
      });
    }
  }

  // No tool calls — done
  if (toolResults.length === 0) break;

  // Feed results back
  messages.push({ role: "assistant", content: response.content });
  messages.push(...toolResults);
}
```

## 3. What tools does Claude get?

Both MCP and direct tools expose the same capabilities:

| Tool | What it does |
|------|-------------|
| `get_balance` | Check balances across all chains or a specific one |
| `evm_transfer` | Send ETH or USDC on Ethereum, Base, Sepolia |
| `solana_transfer` | Send SOL or USDC on Solana |
| `solana_swap` | Swap any token via Jupiter |
| `get_transaction_status` | Check if a transaction confirmed |
| `get_transaction_history` | View past transactions |
| `search_solana_tokens` | Look up tokens by name or symbol |

Every tool returns a consistent result:

```typescript
// Success
{ status: "success", data: { ... } }

// Error
{ status: "error", error: "Insufficient balance" }
```

## 4. Test with testnets

Use testnet mode to develop without real money:

```typescript
const wallet = await SpongeWallet.connect({ testnet: true });
```

This restricts the agent to Sepolia, Base Sepolia, Tempo, and Solana Devnet.

## 5. Use the CLI for quick setup

The SDK includes a CLI for managing auth outside your code:

```bash
# Login (opens browser)
npx spongewallet login

# Login to testnet
npx spongewallet login --testnet

# Check who you're logged in as
npx spongewallet whoami

# Logout
npx spongewallet logout
```

## Complete example

A minimal agent that can manage its own wallet:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import { SpongeWallet } from "@paysponge/sdk";

async function main() {
  const wallet = await SpongeWallet.connect({
    name: "my-first-agent",
    testnet: true,
  });

  const addresses = await wallet.getAddresses();
  console.log("Agent wallets:");
  console.log("  Base:", addresses["base-sepolia"]);
  console.log("  Solana:", addresses["solana-devnet"]);

  // Let Claude drive
  for await (const msg of query({
    prompt: "Check all my balances and tell me which chain has the most funds.",
    options: {
      mcpServers: {
        wallet: wallet.mcp(),
      },
    },
  })) {
    console.log(msg);
  }
}

main();
```

## Next steps

- [Wallets & Transfers](./wallets-and-transfers.md) — Direct SDK calls without Claude
- [Authentication](./authentication.md) — API keys, device flow, credential storage
- [API Reference](./api-reference.md) — Every method and type
