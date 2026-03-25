# SpongeWallet SDK

SDK for creating and managing wallets for AI agents with Claude Agent SDK integration.

## Installation

```bash
npm install @paysponge/sdk
# or
bun add @paysponge/sdk
```

## Quick Start

```typescript
import { SpongeWallet } from "@paysponge/sdk";

// Connect (handles auth automatically via browser)
const wallet = await SpongeWallet.connect();

// Get addresses
const addresses = await wallet.getAddresses();
console.log(addresses.base);    // 0x...
console.log(addresses.solana);  // 5x...

// Check balances
const balances = await wallet.getBalances();

// Transfer tokens
await wallet.transfer({
  chain: "base",
  to: "0x...",
  amount: "10",
  currency: "USDC",
});
```

## Generated OpenAPI Client

The package also exports the raw OpenAPI Generator request builder for advanced
REST usage:

```typescript
import {
  HttpClient,
  createGeneratedApiClient,
} from "@paysponge/sdk";

const http = new HttpClient({ apiKey: "sponge_test_xxx" });
const client = createGeneratedApiClient(http);

const currentAgent = await client.request<Record<string, unknown>>(
  client.api.getApiAgentsMeRequestOpts(),
);
```

The current backend spec is missing response schemas for most endpoints, so the
generated layer is used for request shapes and paths while the SDK keeps its
existing response parsing on top.

## Authentication

### Device Flow (Browser)

On first run, `connect()` opens your browser for login. After approval, credentials are cached at `~/.spongewallet/credentials.json`.

### API Key

```typescript
const wallet = await SpongeWallet.connect({
  apiKey: "sponge_test_...",
});
```

Or via environment variable:

```bash
SPONGE_API_KEY=sponge_test_xxx node my-bot.js
```

### Master Keys (Programmatic Agent Creation)

`SpongeAdmin` is not part of the SDK surface. For master-key automation,
call the REST API directly (for example, `POST /api/agents`) using
`Authorization: Bearer sponge_master_...`.

## Claude Agent SDK Integration

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import { SpongeWallet } from "@paysponge/sdk";

const wallet = await SpongeWallet.connect();

for await (const msg of query({
  prompt: "Check my wallet balance and transfer 5 USDC to 0x...",
  options: {
    mcpServers: {
      wallet: wallet.mcp(),
    },
  },
})) {
  console.log(msg);
}
```

## Supported Chains

- **EVM**: Ethereum, Base, Monad, Sepolia, Base Sepolia, Tempo
- **Solana**: Mainnet, Devnet

## Features

- Multi-chain wallet management (EVM + Solana)
- Token transfers and swaps (Jupiter on Solana)
- MCP server for Claude Agent SDK
- Anthropic SDK tool definitions
- Spending limits and allowlists
- x402 payment protocol support

## Documentation

Canonical docs live in the repo's top-level Mintlify source:

- [Welcome](https://github.com/paysponge/sponge/blob/main/docs/index.mdx)
- [Self-Registration](https://github.com/paysponge/sponge/blob/main/docs/quickstart-self-registration.mdx)
- [AI Agents](https://github.com/paysponge/sponge/blob/main/docs/quickstart-ai-agents.mdx)
- [Platforms](https://github.com/paysponge/sponge/blob/main/docs/quickstart-platforms.mdx)
- [Trading & Payments](https://github.com/paysponge/sponge/blob/main/docs/quickstart-trading.mdx)
- [CLI](https://github.com/paysponge/sponge/blob/main/docs/cli.mdx)
- [Authentication](https://github.com/paysponge/sponge/blob/main/docs/authentication.mdx)
- [Wallets & Transfers](https://github.com/paysponge/sponge/blob/main/docs/wallets-and-transfers.mdx)
- [Claude Integration](https://github.com/paysponge/sponge/blob/main/docs/claude-integration.mdx)
- [SDK Reference](https://github.com/paysponge/sponge/blob/main/docs/sdk-reference.mdx)
- [Master Keys](https://github.com/paysponge/sponge/blob/main/docs/master-keys.mdx)

Generated-client examples:
- [TypeScript direct OpenAPI example](./examples/openapi-generated.ts)
- [Python generated client package](../../python/spongewallet-openapi/README.md)

## CLI

```bash
# Create agent immediately, claim later
npx spongewallet init

# Agent-first with email for claim matching
npx spongewallet init --email alice@example.com

# Claim pending agent or do normal login if no pending claim exists
npx spongewallet login

# Curated wallet workflows
npx spongewallet wallet balance
npx spongewallet wallet send --chain base --to 0xabc... --amount 10 --asset USDC
npx spongewallet tx status --chain base --tx-hash 0x123...

# Raw tool commands remain available under "advanced"
npx spongewallet advanced get-balance --chain base

# Check current session
npx spongewallet whoami

# Print authenticated MCP config
npx spongewallet mcp print

# Logout
npx spongewallet logout
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SPONGE_API_KEY` | Agent API key (skips device flow) |
| `SPONGE_MASTER_KEY` | Master key for programmatic agent creation |
| `SPONGE_API_URL` | Custom API URL |

## License

MIT
