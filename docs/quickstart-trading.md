# Quickstart: Trading & DeFi

Build an AI agent that trades — swaps on Jupiter and 0x, perpetuals on Hyperliquid, cross-chain bridges, and automated strategies.

## Prerequisites

- Node.js 18+ or Bun
- A funded SpongeWallet (you'll need tokens to trade)

## Install

```bash
npm install @paysponge/sdk
```

## 1. Connect and check your position

```typescript
import { SpongeWallet } from "@paysponge/sdk";

const wallet = await SpongeWallet.connect();

// See what you're working with
const balances = await wallet.getDetailedBalances();
console.log(balances);
// {
//   base: { address: "0x...", balances: [{ token: "ETH", amount: "0.5", usdValue: "1250.00" }] },
//   solana: { address: "5x...", balances: [{ token: "SOL", amount: "10", usdValue: "1500.00" }] }
// }
```

## 2. Swap tokens

### Solana (Jupiter)

```typescript
// Swap 1 SOL for USDC
const tx = await wallet.swap({
  chain: "solana",
  from: "SOL",
  to: "USDC",
  amount: "1",
  slippageBps: 50, // 0.5% — optional, default is 50
});

console.log(tx.txHash);
console.log(tx.status); // "pending" | "confirmed" | "failed"
```

Search for tokens before swapping:

```typescript
// Find a token
const results = await wallet.searchSolanaTokens("BONK", 5);
console.log(results);

// Swap using the mint address
const tx = await wallet.swap({
  chain: "solana",
  from: "SOL",
  to: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK mint
  amount: "0.1",
});
```

### EVM (via Claude tools)

Base swaps use 0x Protocol and are available through the Claude tool interface:

```typescript
const tools = wallet.tools();

// Execute a Base swap through the tool executor
const result = await tools.execute("base_swap", {
  chain: "base",
  inputToken: "ETH",
  outputToken: "USDC",
  amount: "0.1",
});
```

## 3. Transfer tokens

### EVM chains

```typescript
const tx = await wallet.transfer({
  chain: "base",
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
  amount: "10",
  currency: "USDC",
});

console.log(tx.explorerUrl); // https://basescan.org/tx/0x...
```

### Solana

```typescript
const tx = await wallet.transfer({
  chain: "solana",
  to: "5xYourRecipientAddress...",
  amount: "1.5",
  currency: "SOL",
});
```

## 4. Trade perpetuals on Hyperliquid

Access Hyperliquid's perp and spot DEX through the tool executor:

```typescript
const tools = wallet.tools();

// Check account status
const status = await tools.execute("hyperliquid", {
  action: "status",
});

// Place a limit order
const order = await tools.execute("hyperliquid", {
  action: "order",
  coin: "ETH",
  size: "0.1",
  price: "3000",
  side: "buy",
  orderType: "limit",
});

// Check open positions
const positions = await tools.execute("hyperliquid", {
  action: "positions",
});

// Set leverage
await tools.execute("hyperliquid", {
  action: "set_leverage",
  coin: "ETH",
  leverage: 5,
});

// Cancel all orders
await tools.execute("hyperliquid", {
  action: "cancel_all",
});
```

Hyperliquid actions: `status`, `order`, `cancel`, `cancel_all`, `set_leverage`, `positions`, `orders`, `fills`, `markets`, `ticker`, `orderbook`, `book_updates`, `funding`, `pnl`, `liquidation_caps`, `liquidations`, `trade_status`, `alerts`, `withdraw`, `transfer`, `chart`.

For richer in-chat charting + traceability:

```typescript
const chart = await tools.execute("hyperliquid", {
  action: "chart",
  symbol: "BTC/USDC:USDC",
  interval: "1h",
  chart_style: "live_line", // default
  trace_tool_call: true, // default
});
```

Backend env for richer Hyperliquid monitoring (QuickNode):

```bash
# Required for stream-backed actions like book_updates/liquidations/trade_status/alerts
QUICKNODE_HYPERLIQUID_STREAM_ENDPOINT=https://<endpoint>.hype-mainnet.quiknode.pro/<token>/hypercore

# Optional but recommended
QUICKNODE_HYPERLIQUID_INFO_ENDPOINT=https://<endpoint>.hype-mainnet.quiknode.pro/<token>/info
QUICKNODE_HYPERLIQUID_HYPERCORE_RPC_ENDPOINT=https://<endpoint>.hype-mainnet.quiknode.pro/<token>/hypercore
QUICKNODE_HYPERLIQUID_HYPERCORE_WSS_ENDPOINT=wss://<endpoint>.hype-mainnet.quiknode.pro/<token>/hypercore/ws
QUICKNODE_HYPERLIQUID_GRPC_ENDPOINT=<endpoint>.hype-mainnet.quiknode.pro:10000
QUICKNODE_HYPERLIQUID_REST_ENDPOINT=https://<endpoint>.hype-mainnet.quiknode.pro/<token>/hypercore
QUICKNODE_HYPERLIQUID_API_VERSION=v1
QUICKNODE_HYPERLIQUID_BEARER_TOKEN= # only if required by your QuickNode setup
```

## 5. Bridge cross-chain

Move assets between chains using deBridge:

```typescript
const tools = wallet.tools();

const result = await tools.execute("bridge", {
  fromChain: "base",
  toChain: "solana",
  inputToken: "USDC",
  outputToken: "USDC",
  amount: "50",
});
```

## 6. Track transactions

```typescript
// Check a specific transaction
const status = await wallet.getTransactionStatus(txHash, "base");
console.log(status.status);       // "confirmed"
console.log(status.blockNumber);  // 12345678
console.log(status.confirmations); // 15

// View recent history
const history = await wallet.getTransactionHistoryDetailed({
  limit: 20,
  chain: "solana",
});
```

## 7. Let Claude trade for you

Combine wallet tools with Claude for AI-driven trading:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import { SpongeWallet } from "@paysponge/sdk";

const wallet = await SpongeWallet.connect();

for await (const msg of query({
  prompt: `You are a trading assistant.
    Check my Solana balance, then swap 50% of my SOL for USDC.
    Report the transaction hash when done.`,
  options: {
    mcpServers: {
      wallet: wallet.mcp(),
    },
  },
})) {
  console.log(msg);
}
```

## 8. x402 payments

Make HTTP requests with automatic crypto payment settlement:

```typescript
// Pay-per-request to x402-enabled APIs
const result = await wallet.x402Fetch({
  url: "https://api.example.com/premium-data",
  method: "GET",
  preferred_chain: "base",
});
```

## Testnet development

Develop without risking real funds:

```typescript
const wallet = await SpongeWallet.connect({ testnet: true });

// Claim 1 USDC on Base Sepolia to get started
await wallet.claimSignupBonus();
```

## Supported currencies

| Chain | Currencies | Swap DEX |
|-------|-----------|----------|
| Ethereum | ETH, USDC | — |
| Base | ETH, USDC | 0x Protocol |
| Solana | SOL, USDC, any SPL token | Jupiter |
| Tempo | pathUSD | — |

## Next steps

- [Wallets & Transfers](./wallets-and-transfers.md) — Full transfer and balance reference
- [Claude Integration](./claude-integration.md) — MCP and tool patterns
- [API Reference](./api-reference.md) — Every method and type
