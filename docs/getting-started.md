# Getting Started

## Installation

```bash
bun add @spongewallet/sdk
```

## Quick Start

### Connect to a wallet

```typescript
import { SpongeWallet } from "@spongewallet/sdk";

const wallet = await SpongeWallet.connect();

// Get addresses
const addresses = await wallet.getAddresses();
console.log(addresses.base);    // 0x...
console.log(addresses.solana);  // 5x...

// Check balances
const balances = await wallet.getBalances();
console.log(balances);
```

On first run, `connect()` opens your browser for login via the OAuth Device Flow. After approval, your API key is cached at `~/.spongewallet/credentials.json`.

### Connect with an existing API key

```typescript
const wallet = await SpongeWallet.connect({
  apiKey: "sponge_test_...",
});
```

Or set the `SPONGE_API_KEY` environment variable:

```bash
SPONGE_API_KEY=sponge_test_xxx bun run my-bot.ts
```

### Connect options

```typescript
const wallet = await SpongeWallet.connect({
  name: "My Bot",           // Agent name (creates new agent if needed)
  agentId: "uuid-...",      // Connect to specific agent
  apiKey: "sponge_test_...",// Skip device flow
  testnet: true,            // Use testnets only
  baseUrl: "http://...",    // Custom API URL
  noBrowser: true,          // Don't auto-open browser
});
```

## Programmatic Agent Creation

Use a master API key with the REST API to spin up agents without browser auth:

```typescript
const response = await fetch("https://api.wallet.paysponge.com/api/agents/", {
  method: "POST",
  headers: {
    Authorization: "Bearer sponge_master_...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name: "bot-1" }),
});
const { apiKey } = await response.json();

// Connect to the agent's wallet
const wallet = await SpongeWallet.connect({ apiKey });
```

See the backend API docs for full master-key lifecycle endpoints.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SPONGE_API_KEY` | Agent API key (skips device flow) |
| `SPONGE_MASTER_KEY` | Optional key for your own REST automation scripts |
| `SPONGE_API_URL` | Custom backend URL (default: `https://api.wallet.paysponge.com`) |

## What Happens on Connect

1. Checks for API key in options, `SPONGE_API_KEY` env var, or `~/.spongewallet/credentials.json`
2. If no key found, starts the OAuth Device Flow (opens browser)
3. Resolves the agent associated with the key
4. Returns a `SpongeWallet` instance ready for use

Each agent has wallets auto-created for all supported chains (EVM + Solana). The same EVM address works across Ethereum, Base, Sepolia, Base Sepolia, and Tempo. The same Solana keypair works on mainnet and devnet.
