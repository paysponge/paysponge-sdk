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

## Platforms

```typescript
import { SpongePlatform } from "@paysponge/sdk";

const platform = await SpongePlatform.connect({
  apiKey: process.env.SPONGE_MASTER_KEY,
});

const { agent, apiKey } = await platform.createAgent({
  name: "support-bot-1",
});

const wallet = await platform.connectAgent({ apiKey });
console.log(agent.id, await wallet.getAddresses());
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

Full docs: [docs.paysponge.com](https://docs.paysponge.com)

- [Welcome](https://docs.paysponge.com)
- [Self-Registration](https://docs.paysponge.com/quickstart-self-registration)
- [Platforms](https://docs.paysponge.com/quickstart-platforms)
- [AI Agents](https://docs.paysponge.com/quickstart-ai-agents)
- [Trading & Payments](https://docs.paysponge.com/quickstart-trading)
- [CLI](https://docs.paysponge.com/cli)
- [Authentication](https://docs.paysponge.com/authentication)
- [Wallets & Transfers](https://docs.paysponge.com/wallets-and-transfers)
- [Claude Integration](https://docs.paysponge.com/claude-integration)
- [SDK Reference](https://docs.paysponge.com/sdk-reference)

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
| `SPONGE_API_URL` | Custom API URL |

## License

MIT
