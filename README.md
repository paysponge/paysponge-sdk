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

- **EVM**: Ethereum, Base, Sepolia, Base Sepolia, Tempo
- **Solana**: Mainnet, Devnet

## Features

- Multi-chain wallet management (EVM + Solana)
- Token transfers and swaps (Jupiter on Solana)
- MCP server for Claude Agent SDK
- Anthropic SDK tool definitions
- Spending limits and allowlists
- x402 payment protocol support

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Authentication](./docs/authentication.md)
- [Wallets & Transfers](./docs/wallets-and-transfers.md)
- [Claude Integration](./docs/claude-integration.md)
- [API Reference](./docs/api-reference.md)
- [OpenAPI Method Generation Plan](./docs/openapi-sdk-method-generation-plan.md)

## CLI

```bash
# Login via browser
npx spongewallet login

# Check current session
npx spongewallet whoami

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
