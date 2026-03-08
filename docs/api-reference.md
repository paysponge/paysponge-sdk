# API Reference

## Classes

### SpongeWallet

The main client for interacting with a single agent's wallets.

#### `SpongeWallet.connect(options?): Promise<SpongeWallet>`

Authenticate and return a connected wallet instance.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | - | Agent name (creates new if needed) |
| `agentId` | `string` | - | Existing agent UUID |
| `apiKey` | `string` | - | API key (skips device flow) |
| `testnet` | `boolean` | - | Testnet mode |
| `baseUrl` | `string` | `https://api.wallet.paysponge.com` | Custom API URL |
| `noBrowser` | `boolean` | `false` | Don't open browser during device flow |

#### `wallet.getAddress(chain): Promise<string | null>`

Returns the wallet address for the given chain.

#### `wallet.getAddresses(): Promise<Record<Chain, string>>`

Returns all wallet addresses. Result is cached after first call.

#### `wallet.getBalance(chain): Promise<Balance>`

Returns token balances for a chain as `Record<string, string>` (e.g., `{ ETH: "0.5" }`).

#### `wallet.getBalances(): Promise<Record<Chain, Balance>>`

Returns balances for all chains.

#### `wallet.getDetailedBalances(options?): Promise<DetailedBalances>`

Returns a per-token balance breakdown (native + tokens) across chains.

| Option | Type | Description |
|--------|------|-------------|
| `chain` | `Chain \| "all"` | Specific chain (default: `"all"`) |
| `allowedChains` | `Chain[]` | Restrict to these chains |
| `onlyUsdc` | `boolean` | Only return USDC balances |

#### `wallet.transfer(options): Promise<TransactionResult>`

Transfer tokens on any supported chain.

| Option | Type | Description |
|--------|------|-------------|
| `chain` | `Chain` | Target chain |
| `to` | `string` | Recipient address |
| `amount` | `string` | Amount to send |
| `currency` | `Currency` | Token: `ETH`, `SOL`, `USDC`, `pathUSD` |

#### `wallet.evmTransfer(options): Promise<SubmitTransaction>`

Transfer on EVM chains with allowlist + spending limits enforced.

| Option | Type | Description |
|--------|------|-------------|
| `chain` | `"ethereum" \| "base" \| "sepolia" \| "base-sepolia"` | EVM chain |
| `to` | `string` | Recipient address |
| `amount` | `string` | Amount to send |
| `currency` | `"ETH" \| "USDC"` | Token |

#### `wallet.solanaTransfer(options): Promise<SubmitTransaction>`

Transfer on Solana with allowlist + spending limits enforced.

| Option | Type | Description |
|--------|------|-------------|
| `chain` | `"solana" \| "solana-devnet"` | Solana chain |
| `to` | `string` | Recipient address |
| `amount` | `string` | Amount to send |
| `currency` | `"SOL" \| "USDC"` | Token |

#### `wallet.swap(options): Promise<TransactionResult>`

Swap tokens on Solana via Jupiter.

| Option | Type | Description |
|--------|------|-------------|
| `chain` | `"solana" \| "solana-devnet"` | Solana chain |
| `from` | `string` | Input token symbol or address |
| `to` | `string` | Output token symbol or address |
| `amount` | `string` | Input amount |
| `slippageBps` | `number` | Slippage in basis points (default: 50) |

#### `wallet.getTransactionStatus(txHash, chain): Promise<TransactionStatus>`

Check the status of a transaction.

#### `wallet.getTransactionHistory(options?): Promise<TransactionStatus[]>`

Get transaction history. Options: `{ limit?: number; offset?: number }`.

#### `wallet.getTransactionHistoryDetailed(options?): Promise<TransactionHistoryDetailed>`

Get transaction history with chain metadata. Options: `{ limit?: number; chain?: Chain }`.

#### `wallet.getSolanaTokens(chain): Promise<SolanaTokensResponse>`

List all SPL tokens held by the agent's Solana wallet.

#### `wallet.searchSolanaTokens(query, limit?): Promise<SolanaTokenSearchResponse>`

Search the Jupiter token list by symbol or name.

#### `wallet.claimSignupBonus(): Promise<SignupBonusClaimResponse>`

Claim the one-time sign-up bonus. Sends 1 USDC on Base to the current agent wallet.
This can only be used once per user account.

<!-- sponge tool temporarily disabled
#### `wallet.sponge(request): Promise<SpongeResponse>`

Call paid APIs via x402 (search, image, predict, crawl, parse, prospect, llm).

```typescript
const result = await wallet.sponge({
  task: "search",
  query: "best pizza in NYC",
});
```
-->

#### `wallet.createX402Payment(options): Promise<X402PaymentResponse>`

Create a signed x402 payment payload.

```typescript
const payment = await wallet.createX402Payment({
  chain: "base",
  to: "0x...",
  amount: "0.01",
  resource_url: "https://api.paysponge.com/api/services/purchase/...",
});
```

#### `wallet.x402Fetch(options): Promise<unknown>`

Fetch a URL with automatic x402 payment handling.

```typescript
const response = await wallet.x402Fetch({
  url: "https://api.example.com/protected",
  method: "GET",
  preferred_chain: "base",
});
```

#### `wallet.createAgent(options): Promise<Agent>`

Create a new agent.

#### `wallet.getAgents(): Promise<Agent[]>`

List all agents for the current user.

#### `wallet.getAgent(): Promise<Agent>`

Get the current agent.

#### `wallet.mcp(): McpConfig`

Get MCP server config for Claude Agent SDK.

#### `wallet.tools(): ToolExecutor`

Get tool definitions and executor for Anthropic SDK.

#### `wallet.getAgentId(): string`

Get the current agent's UUID.

---

Master-key automation is available via backend REST endpoints, not a dedicated SDK admin client.

---

### HttpClient

Low-level HTTP client. Exported for advanced usage.

```typescript
import { HttpClient } from "@paysponge/sdk";

const http = new HttpClient({
  baseUrl: "https://api.wallet.paysponge.com",
  apiKey: "sponge_test_...",
});

const data = await http.get("/api/agents");
```

#### Methods

- `get<T>(path, params?): Promise<T>`
- `post<T>(path, body?): Promise<T>`
- `put<T>(path, body?): Promise<T>`
- `delete<T>(path): Promise<T>`
- `getBaseUrl(): string`
- `getApiKey(): string`

### PublicToolsApi

REST wrapper for the public tool endpoints (balances, transfers, etc).

```typescript
import { HttpClient, PublicToolsApi } from "@paysponge/sdk";

const http = new HttpClient({ apiKey: "sponge_test_..." });
const tools = new PublicToolsApi(http);

const balances = await tools.getDetailedBalances({ onlyUsdc: true });
```

### SpongeApiError

Error thrown by HTTP client.

```typescript
import { SpongeApiError } from "@paysponge/sdk";

try {
  await wallet.transfer({ ... });
} catch (err) {
  if (err instanceof SpongeApiError) {
    console.log(err.statusCode);  // 400
    console.log(err.errorCode);   // "insufficient_funds"
    console.log(err.message);     // "Insufficient balance"
  }
}
```

---

## Types

### Chain

```typescript
type Chain = "ethereum" | "base" | "sepolia" | "base-sepolia" | "tempo" | "solana" | "solana-devnet";
```

### Currency

```typescript
type Currency = "ETH" | "SOL" | "USDC" | "pathUSD";
```

### Agent

```typescript
type Agent = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "paused" | "suspended";
  dailySpendingLimit: string | null;
  weeklySpendingLimit: string | null;
  monthlySpendingLimit: string | null;
  createdAt: Date;
  updatedAt: Date;
};
```

### TransactionResult

```typescript
type TransactionResult = {
  txHash: string;
  status: "pending" | "confirmed" | "failed";
  explorerUrl?: string;
  chainId?: number;
};
```

### SubmitTransaction

```typescript
type SubmitTransaction = {
  transactionHash: string;
  status: string;
  explorerUrl?: string;
  message?: string;
};
```

### DetailedBalances

```typescript
type DetailedBalances = {
  [chain: string]: {
    address: string;
    balances: Array<{ token: string; amount: string; usdValue?: string }>;
  };
};
```

<!-- sponge tool types temporarily disabled
### SpongeResponse

```typescript
type SpongeResponse = {
  status: "success" | "payment_required" | "error";
  task: string;
  provider: string;
  summary?: string;
  data?: unknown;
};
```
-->

### X402PaymentResponse

```typescript
type X402PaymentResponse = {
  paymentPayload: unknown;
  paymentPayloadBase64: string;
  headerName?: string;
  paymentRequirements: {
    scheme: "exact";
    network: string;
    maxAmountRequired: string;
    asset: string;
    payTo: string;
  };
  expiresAt: string;
};
```

### TransactionStatus

```typescript
type TransactionStatus = {
  txHash: string;
  status: "pending" | "confirmed" | "failed" | "unknown";
  blockNumber: number | null;
  confirmations: number | null;
  errorMessage: string | null;
};
```

### McpConfig

```typescript
type McpConfig = {
  url: string;
  headers: Record<string, string>;
};
```

### ToolResult

```typescript
type ToolResult =
  | { status: "success"; data: unknown }
  | { status: "error"; error: string };
```
