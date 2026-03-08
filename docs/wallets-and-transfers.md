# Wallets & Transfers

## Supported Chains

| Chain | Type | Testnet | Chain ID |
|-------|------|---------|----------|
| `ethereum` | EVM | No | 1 |
| `base` | EVM | No | 8453 |
| `sepolia` | EVM | Yes | 11155111 |
| `base-sepolia` | EVM | Yes | 84532 |
| `tempo` | EVM | Yes | 42431 |
| `solana` | Solana | No | 101 |
| `solana-devnet` | Solana | Yes | 102 |

All EVM chains share the same wallet address. Solana mainnet and devnet share the same keypair.

## Addresses

```typescript
// Get a single address
const baseAddr = await wallet.getAddress("base");       // 0x...
const solAddr = await wallet.getAddress("solana");       // 5x...

// Get all addresses at once (cached after first call)
const addresses = await wallet.getAddresses();
// { ethereum: "0x...", base: "0x...", solana: "5x...", ... }
```

## Balances

```typescript
// Single chain
const balance = await wallet.getBalance("base");
// { ETH: "0.05", USDC: "100.00" }

// All chains
const balances = await wallet.getBalances();
// { base: { ETH: "0.05" }, solana: { SOL: "1.5" }, ... }
```

### Detailed Balances

```typescript
const detailed = await wallet.getDetailedBalances({ onlyUsdc: true });
// {
//   base: { address: "0x...", balances: [{ token: "USDC", amount: "10.5" }] },
//   solana: { address: "5x...", balances: [{ token: "USDC", amount: "2.1" }] }
// }
```

## Transfers

### EVM Transfer

```typescript
const tx = await wallet.transfer({
  chain: "base",
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
  amount: "10",
  currency: "USDC",
});

console.log(tx.txHash);      // 0x...
console.log(tx.status);      // "pending" | "confirmed" | "failed"
console.log(tx.explorerUrl); // https://basescan.org/tx/0x...
```

#### Enforced (Allowlist + Spending Limits)

```typescript
const tx = await wallet.evmTransfer({
  chain: "base",
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
  amount: "10",
  currency: "USDC",
});
```

### Solana Transfer

```typescript
const tx = await wallet.transfer({
  chain: "solana",
  to: "5x...",
  amount: "1.5",
  currency: "SOL",
});
```

#### Enforced (Allowlist + Spending Limits)

```typescript
const tx = await wallet.solanaTransfer({
  chain: "solana",
  to: "5x...",
  amount: "1.5",
  currency: "SOL",
});
```

### Solana Swap (Jupiter)

```typescript
const tx = await wallet.swap({
  chain: "solana",
  from: "SOL",
  to: "USDC",
  amount: "1",
  slippageBps: 50, // 0.5% slippage (optional, default 50)
});
```

### Supported Currencies

- **EVM**: `ETH`, `USDC`, `pathUSD`
- **Solana**: `SOL`, `USDC`

Notes:
- `pathUSD` is only supported on `tempo` and uses gas sponsorship by default.

## Transaction Status

```typescript
const status = await wallet.getTransactionStatus(txHash, "base");
console.log(status.status);        // "pending" | "confirmed" | "failed" | "unknown"
console.log(status.blockNumber);   // 12345678
console.log(status.confirmations); // 3
console.log(status.errorMessage);  // null or error string
```

## Transaction History

```typescript
const history = await wallet.getTransactionHistory({
  limit: 20,
  offset: 0,
});
```

### Detailed Transaction History

```typescript
const history = await wallet.getTransactionHistoryDetailed({
  limit: 20,
  chain: "base",
});
```

## Advanced Operations

### Solana Token Discovery

```typescript
const tokens = await wallet.getSolanaTokens("solana");
const results = await wallet.searchSolanaTokens("BONK", 5);
```
