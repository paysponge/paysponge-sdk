# Sponge SDK

Wallet and platform SDK for agent builders using Sponge.

## Installation

```bash
npm install @paysponge/sdk
# or
bun add @paysponge/sdk
```

## Documentation

Full docs: [docs.paysponge.com](https://docs.paysponge.com)

- [Welcome](https://docs.paysponge.com)
- [Platforms](https://docs.paysponge.com/quickstart-platforms)
- [AI Agents](https://docs.paysponge.com/quickstart-ai-agents)
- [Self-Registration](https://docs.paysponge.com/quickstart-self-registration)
- [CLI](https://docs.paysponge.com/cli)
- [TypeScript Examples](https://docs.paysponge.com/typescript-examples)
- [Authentication](https://docs.paysponge.com/authentication)
- [Wallets & Transfers](https://docs.paysponge.com/wallets-and-transfers)
- [Trading](https://docs.paysponge.com/quickstart-trading)
- [Payments](https://docs.paysponge.com/quickstart-payments)
- [Claude Integration](https://docs.paysponge.com/claude-integration)
- [SDK Reference](https://docs.paysponge.com/sdk-reference)

## How Sponge Works

Sponge has two SDK clients:

- `SpongeWallet`: the agent-scoped runtime client
- `SpongePlatform`: the platform control-plane client for creating and managing many agents

Use `SpongeWallet` when one agent is acting with its own wallet. Use `SpongePlatform` when your backend needs to provision agents, rotate keys, or manage a fleet.

## Agent Keys

Agent API keys are scoped to one agent. Use them with `SpongeWallet`.

You can get an agent-scoped API key in a few ways:

- from the dashboard for an existing agent
- `npx spongewallet init` to create an agent immediately and claim it later
- `SpongeWallet.connect()` browser auth flow if you want browser auth and cached local credentials
- `SpongePlatform.createAgent()` if your platform is provisioning agents server-side
- `POST /api/agents/register` for self-registration flows

Example:

```typescript
import { SpongeWallet } from "@paysponge/sdk";

const wallet = await SpongeWallet.connect({
  apiKey: process.env.SPONGE_API_KEY,
});

const addresses = await wallet.getAddresses();
console.log(addresses.base);
console.log(await wallet.getBalances());
```

## Platform Keys

Platform API keys are account-level keys with the `sponge_master_...` prefix. Create them in Dashboard -> Settings -> Master API Keys, then use them with `SpongePlatform`.

Platform keys are for control-plane actions:

- create agents
- list and update agents
- rotate agent API keys
- manage many agents from one backend

Each agent still gets its own runtime API key. Your platform backend should use the platform key to provision agents, then store the returned agent key per agent and use that key at runtime.

Example:

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

## Platforms

If you are building a product that manages hundreds of agents, the intended pattern is:

1. Your backend authenticates with `SpongePlatform` using a platform key.
2. It creates one Sponge agent per user, bot, or worker.
3. It stores the returned agent API key with your own internal record.
4. Each running agent connects with `SpongeWallet` using its own agent key.

That keeps provisioning and runtime separate:

- platform key: create and administer agents
- agent key: spend, swap, transfer, MCP, and tools for one agent

## Authentication

### Browser Auth Flow

On first run, `connect()` opens your browser for login. After approval, credentials are cached at `~/.spongewallet/credentials.json`.

### Agent API Key

```typescript
const wallet = await SpongeWallet.connect({
  apiKey: "sponge_test_...",
});
```

Or via environment variable:

```bash
SPONGE_API_KEY=sponge_test_xxx node my-bot.js
```

### Platform API Key

```typescript
const platform = await SpongePlatform.connect({
  apiKey: process.env.SPONGE_MASTER_KEY,
});
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

- Ethereum
- Base
- Tempo
- Solana

## Features

- Multi-chain wallet management (EVM + Solana)
- Token transfers and swaps (Jupiter on Solana)
- MCP server for Claude Agent SDK
- Anthropic SDK tool definitions
- Spending limits and allowlists
- x402 and MPP payment protocol support

## CLI

```bash
# Create agent immediately, claim later
npx spongewallet init

# Agent-first with email for claim matching
npx spongewallet init --email alice@example.com

# Claim pending agent or do normal login if no pending claim exists
npx spongewallet login

# Replace the cached agent with a different login
npx spongewallet login --switch

# Curated wallet workflows
npx spongewallet balance
npx spongewallet send base 0xabc... USDC 10
npx spongewallet swap tempo pathUSD USDC.e 1
npx spongewallet tx status base 0x123...

# Raw tool commands remain available under "advanced"
npx spongewallet advanced get-balance --chain base

# Check current session
npx spongewallet whoami

# Print authenticated MCP config
npx spongewallet mcp print

# Logout
npx spongewallet logout
```

## CLI telemetry

The CLI emits anonymous usage events to Sponge's PostHog project so we can measure command adoption and authentication success rates. It does not send raw command arguments, API keys, wallet addresses, or email values.

Telemetry includes high-level metadata such as:

- command path and status
- duration
- flag names without values
- whether auth came from env vars or cached credentials
- coarse base URL classification (`default`, `localhost`, or `custom`)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SPONGE_API_KEY` | Agent API key (skips the browser auth flow) |
| `SPONGE_MASTER_KEY` | Platform API key for `SpongePlatform` |
| `SPONGE_API_URL` | Custom API URL |

## License

MIT
