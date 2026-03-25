import { z } from "zod";

// ============================================================================
// Chain Types
// ============================================================================

export const ChainSchema = z.enum([
  "ethereum",
  "base",
  "monad",
  "sepolia",
  "base-sepolia",
  "tempo-testnet",
  "tempo",
  "solana",
  "solana-devnet",
]);
export type Chain = z.infer<typeof ChainSchema>;

export const ChainTypeSchema = z.enum(["evm", "solana"]);
export type ChainType = z.infer<typeof ChainTypeSchema>;

export const CurrencySchema = z.string();
export type Currency = z.infer<typeof CurrencySchema>;

export const EvmChainSchema = z.enum([
  "ethereum",
  "base",
  "monad",
  "sepolia",
  "base-sepolia",
]);
export type EvmChain = z.infer<typeof EvmChainSchema>;

export const SolanaChainSchema = z.enum(["solana", "solana-devnet"]);
export type SolanaChain = z.infer<typeof SolanaChainSchema>;

// Mainnet chains only
export const MainnetChainSchema = z.enum(["ethereum", "base", "monad", "tempo", "solana"]);
export type MainnetChain = z.infer<typeof MainnetChainSchema>;

// Testnet chains only
export const TestnetChainSchema = z.enum([
  "sepolia",
  "base-sepolia",
  "tempo-testnet",
  "solana-devnet",
]);
export type TestnetChain = z.infer<typeof TestnetChainSchema>;

// ============================================================================
// Address Validation
// ============================================================================

export const EthereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

export const SolanaAddressSchema = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana address");

export const AddressSchema = z.string().refine(
  (val) =>
    /^0x[a-fA-F0-9]{40}$/.test(val) ||
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val),
  { message: "Invalid address" }
);

// ============================================================================
// Connect Options
// ============================================================================

export const ConnectOptionsSchema = z.object({
  /** Agent name (creates new agent if doesn't exist) */
  name: z.string().min(1).max(255).optional(),
  /** Existing agent ID to connect to */
  agentId: z.string().uuid().optional(),
  /** API key to use (skips device flow) */
  apiKey: z.string().optional(),
  /** Use testnets only */
  testnet: z.boolean().optional(),
  /** Base URL for the API (defaults to production) */
  baseUrl: z.string().url().optional(),
  /** Disable browser auto-open during device flow */
  noBrowser: z.boolean().optional(),
  /** Custom path to store credentials file (defaults to ~/.spongewallet/credentials.json) */
  credentialsPath: z.string().optional(),
  /** Email to associate with the agent (used for claim matching) */
  email: z.string().email().optional(),
});
export type ConnectOptions = z.infer<typeof ConnectOptionsSchema>;

export const PlatformConnectOptionsSchema = z.object({
  /** Master API key to use for platform control-plane operations */
  apiKey: z.string().optional(),
  /** Base URL for the API (defaults to production) */
  baseUrl: z.string().url().optional(),
});
export type PlatformConnectOptions = z.infer<typeof PlatformConnectOptionsSchema>;

export const RegisterAgentOptionsSchema = z.object({
  name: z.string().min(1).max(255),
  agentFirst: z.boolean().optional(),
  testnet: z.boolean().optional(),
  claimRequired: z.boolean().optional(),
  email: z.string().email().optional(),
  baseUrl: z.string().url().optional(),
});
export type RegisterAgentOptions = z.infer<typeof RegisterAgentOptionsSchema>;

// ============================================================================
// Agent Types
// ============================================================================

export const CreateAgentOptionsSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  dailySpendingLimit: z.string().optional(),
  weeklySpendingLimit: z.string().optional(),
  monthlySpendingLimit: z.string().optional(),
});
export type CreateAgentOptions = z.infer<typeof CreateAgentOptionsSchema>;

export const PlatformCreateAgentOptionsSchema = CreateAgentOptionsSchema.extend({
  isTestMode: z.boolean().optional(),
});
export type PlatformCreateAgentOptions = z.infer<typeof PlatformCreateAgentOptionsSchema>;

export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullish(),
  status: z.enum(["active", "paused", "suspended"]),
  dailySpendingLimit: z.string().nullish(),
  weeklySpendingLimit: z.string().nullish(),
  monthlySpendingLimit: z.string().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().nullish(),
});
export type Agent = z.infer<typeof AgentSchema>;

export const MasterApiKeySchema = z.object({
  id: z.string().uuid(),
  keyPrefix: z.string(),
  keyName: z.string().nullish(),
  scopes: z.array(z.string()),
  isActive: z.boolean(),
  usageCount: z.number(),
  lastUsedAt: z.coerce.date().nullish(),
  expiresAt: z.coerce.date().nullish(),
  createdAt: z.coerce.date(),
});
export type MasterApiKey = z.infer<typeof MasterApiKeySchema>;

export const CreatedMasterApiKeySchema = z.object({
  id: z.string().uuid(),
  apiKey: z.string(),
  keyName: z.string().nullish(),
  scopes: z.array(z.string()),
  createdAt: z.coerce.date(),
});
export type CreatedMasterApiKey = z.infer<typeof CreatedMasterApiKeySchema>;

// ============================================================================
// Wallet Types
// ============================================================================

export const WalletSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  chainId: z.number(),
  chainName: z.string(),
  chainType: ChainTypeSchema.optional(),
  address: z.string(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  // Balance fields (optional, populated when requested)
  balance: z.string().optional(),
  balanceUsdValue: z.string().optional(),
  symbol: z.string().optional(),
});
export type Wallet = z.infer<typeof WalletSchema>;

export const TokenBalanceSchema = z.object({
  tokenAddress: z.string(),
  symbol: z.string(),
  name: z.string(),
  decimals: z.number(),
  balance: z.string(),
  formatted: z.string(),
  usdValue: z.string().optional(),
});
export type TokenBalance = z.infer<typeof TokenBalanceSchema>;

export const BalanceSchema = z.record(z.string()); // e.g., { ETH: "0.5", USDC: "100.00" }
export type Balance = z.infer<typeof BalanceSchema>;

export const AllBalancesSchema = z.record(ChainSchema, BalanceSchema);
export type AllBalances = z.infer<typeof AllBalancesSchema>;

// ============================================================================
// Transfer Types
// ============================================================================

export const TransferOptionsSchema = z.object({
  chain: ChainSchema,
  to: AddressSchema,
  amount: z.string(),
  currency: CurrencySchema.optional(),
  token: z.string().optional(),
}).refine(value => Boolean(value.currency || value.token), {
  message: "Either currency or token is required",
});
export type TransferOptions = z.infer<typeof TransferOptionsSchema>;

export const TransactionResultSchema = z.object({
  txHash: z.string(),
  status: z.enum(["pending", "confirmed", "failed"]),
  explorerUrl: z.string().optional(),
  chainId: z.number().optional(),
});
export type TransactionResult = z.infer<typeof TransactionResultSchema>;

export const TransactionStatusSchema = z.object({
  txHash: z.string(),
  status: z.enum(["pending", "confirmed", "failed", "unknown"]),
  blockNumber: z.number().nullable(),
  confirmations: z.number().nullable(),
  errorMessage: z.string().nullable(),
});
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

// ============================================================================
// Swap Types (Solana via Jupiter)
// ============================================================================

export const SwapOptionsSchema = z.object({
  chain: z.literal("solana").or(z.literal("solana-devnet")),
  from: z.string(), // Token symbol or address
  to: z.string(), // Token symbol or address
  amount: z.string(),
  slippageBps: z.number().min(0).max(10000).optional(), // Basis points
});
export type SwapOptions = z.infer<typeof SwapOptionsSchema>;

// ============================================================================
// Public Tool Types (REST API helpers)
// ============================================================================

export const DetailedTokenBalanceSchema = z.object({
  token: z.string(),
  amount: z.string(),
  usdValue: z.string().optional(),
});
export type DetailedTokenBalance = z.infer<typeof DetailedTokenBalanceSchema>;

export const DetailedChainBalanceSchema = z.object({
  address: z.string(),
  balances: z.array(DetailedTokenBalanceSchema),
});
export type DetailedChainBalance = z.infer<typeof DetailedChainBalanceSchema>;

export const DetailedBalancesSchema = z.record(z.string(), DetailedChainBalanceSchema);
export type DetailedBalances = z.infer<typeof DetailedBalancesSchema>;

export const EvmTransferOptionsSchema = z.object({
  chain: EvmChainSchema,
  to: EthereumAddressSchema,
  amount: z.string(),
  currency: z.enum(["ETH", "USDC"]),
});
export type EvmTransferOptions = z.infer<typeof EvmTransferOptionsSchema>;

export const SolanaTransferOptionsSchema = z.object({
  chain: SolanaChainSchema,
  to: SolanaAddressSchema,
  amount: z.string(),
  currency: z.enum(["SOL", "USDC"]),
});
export type SolanaTransferOptions = z.infer<typeof SolanaTransferOptionsSchema>;

export const SubmitTransactionSchema = z.object({
  transactionHash: z.string(),
  status: z.string(),
  explorerUrl: z.string().optional(),
  message: z.string().optional(),
});
export type SubmitTransaction = z.infer<typeof SubmitTransactionSchema>;

export const SolanaTokensResponseSchema = z.object({
  address: z.string(),
  tokens: z.array(
    z.object({
      mint: z.string(),
      symbol: z.string(),
      name: z.string(),
      balance: z.string(),
      decimals: z.number(),
      logoURI: z.string().nullable(),
      verified: z.boolean(),
    }),
  ),
});
export type SolanaTokensResponse = z.infer<typeof SolanaTokensResponseSchema>;

export const SolanaTokenSearchResponseSchema = z.object({
  tokens: z.array(
    z.object({
      mint: z.string(),
      symbol: z.string(),
      name: z.string(),
      decimals: z.number(),
      logoURI: z.string().nullable(),
      verified: z.boolean(),
    }),
  ),
});
export type SolanaTokenSearchResponse = z.infer<typeof SolanaTokenSearchResponseSchema>;

export const OnrampCryptoOptionsSchema = z.object({
  wallet_address: z.string(),
  provider: z.enum(["auto", "stripe", "coinbase"]).optional(),
  chain: z.enum(["base", "solana", "polygon"]).optional(),
  fiat_amount: z.string().optional(),
  fiat_currency: z.string().optional(),
  lock_wallet_address: z.boolean().optional(),
  redirect_url: z.string().optional(),
});
export type OnrampCryptoOptions = z.infer<typeof OnrampCryptoOptionsSchema>;

export const OnrampCryptoResponseSchema = z.object({
  success: z.literal(true),
  provider: z.enum(["stripe", "coinbase"]),
  url: z.string(),
  sessionId: z.string(),
  status: z.literal("initiated"),
  destinationChain: z.enum(["base", "solana", "polygon"]),
  destinationAddress: z.string(),
  destinationCurrency: z.literal("USDC"),
  clientSecret: z.string().optional(),
});
export type OnrampCryptoResponse = z.infer<typeof OnrampCryptoResponseSchema>;

export const SignupBonusClaimResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  amount: z.string(),
  currency: z.literal("USDC"),
  chain: z.literal("base"),
  recipientAddress: z.string(),
  transactionHash: z.string(),
  explorerUrl: z.string(),
});
export type SignupBonusClaimResponse = z.infer<typeof SignupBonusClaimResponseSchema>;


export const TransactionHistoryDetailedSchema = z.object({
  transactions: z.array(
    z.object({
      txHash: z.string().nullable(),
      status: z.string(),
      from: z.string(),
      to: z.string(),
      value: z.string(),
      token: z.string(),
      direction: z.string(),
      chain: z.string(),
      timestamp: z.string(),
    }),
  ),
  total: z.number(),
  hasMore: z.boolean(),
});
export type TransactionHistoryDetailed = z.infer<typeof TransactionHistoryDetailedSchema>;

export const SpongeResponseSchema = z.object({
  summary: z.string().optional(),
  status: z.enum(["success", "payment_required", "error"]),
  task: z.string(),
  provider: z.string(),
  data: z.unknown().optional(),
  image_data: z.string().optional(),
  image_mime_type: z.string().optional(),
  payment: z
    .object({
      chain: z.string(),
      to: z.string(),
      token: z.string(),
      amount: z.string(),
      raw_amount: z.string(),
      decimals: z.number(),
    })
    .optional(),
  payment_made: z
    .object({
      chain: z.string(),
      to: z.string(),
      amount: z.string(),
      token: z.string(),
      expiresAt: z.string(),
    })
    .optional(),
  wallet_balance: DetailedBalancesSchema.optional(),
  next_step: z.string().optional(),
  error: z.string().optional(),
  api_error_details: z.unknown().optional(),
  receipt: z.unknown().optional(),
});
export type SpongeResponse = z.infer<typeof SpongeResponseSchema>;

export const X402PaymentResponseSchema = z.object({
  paymentPayload: z.unknown(),
  paymentPayloadBase64: z.string(),
  headerName: z.string().optional(),
  paymentRequirements: z.object({
    scheme: z.literal("exact"),
    network: z.string(),
    maxAmountRequired: z.string(),
    asset: z.string(),
    payTo: z.string(),
  }),
  expiresAt: z.string(),
});
export type X402PaymentResponse = z.infer<typeof X402PaymentResponseSchema>;

// ============================================================================
// Device Flow Auth Types
// ============================================================================

export const DeviceCodeResponseSchema = z.object({
  deviceCode: z.string(),
  userCode: z.string(),
  verificationUri: z.string().url(),
  expiresIn: z.number(),
  interval: z.number(),
});
export type DeviceCodeResponse = z.infer<typeof DeviceCodeResponseSchema>;

export const TokenResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number().optional(),
  refreshToken: z.string().optional(),
  agentId: z.string().uuid().nullable().optional(),
  apiKey: z.string(), // The API key to save
  keyType: z.enum(["agent", "master"]).optional(),
});
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

export const DeviceFlowErrorSchema = z.object({
  error: z.enum([
    "authorization_pending",
    "slow_down",
    "access_denied",
    "expired_token",
  ]),
  errorDescription: z.string().optional(),
});
export type DeviceFlowError = z.infer<typeof DeviceFlowErrorSchema>;

export const AgentRegistrationResponseSchema = z.object({
  deviceCode: z.string(),
  userCode: z.string(),
  verificationUri: z.string().url(),
  verificationUriComplete: z.string().url(),
  expiresIn: z.number(),
  interval: z.number(),
  claimCode: z.string(),
  claimText: z.string().nullable(),
  agentId: z.string().uuid().nullable(),
  apiKey: z.string().nullable(),
});
export type AgentRegistrationResponse = z.infer<typeof AgentRegistrationResponseSchema>;

export const AgentFirstRegistrationResponseSchema = AgentRegistrationResponseSchema.extend({
  agentId: z.string().uuid(),
  apiKey: z.string(),
});
export type AgentFirstRegistrationResponse = z.infer<typeof AgentFirstRegistrationResponseSchema>;

// ============================================================================
// Credentials (stored locally)
// ============================================================================

export const CredentialsSchema = z.object({
  apiKey: z.string(),
  agentId: z.string().uuid(),
  agentName: z.string().optional(),
  testnet: z.boolean().optional(),
  createdAt: z.coerce.date(),
  baseUrl: z.string().url().optional(),
  claimCode: z.string().optional(),
  claimUrl: z.string().url().optional(),
  claimText: z.string().nullable().optional(),
});
export type Credentials = z.infer<typeof CredentialsSchema>;

// ============================================================================
// MCP Config
// ============================================================================

export const McpConfigSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string()),
});
export type McpConfig = z.infer<typeof McpConfigSchema>;

// ============================================================================
// Tool Types (for direct Anthropic SDK usage)
// ============================================================================

export const ToolInputSchema = z.record(z.unknown());
export type ToolInput = z.infer<typeof ToolInputSchema>;

export const ToolResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("success"),
    data: z.unknown(),
  }),
  z.object({
    status: z.literal("error"),
    error: z.string(),
  }),
]);
export type ToolResult = z.infer<typeof ToolResultSchema>;

// ============================================================================
// API Error
// ============================================================================

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ============================================================================
// Chain Info
// ============================================================================

export const ChainInfoSchema = z.object({
  chainId: z.number(),
  name: z.string(),
  symbol: z.string(),
  explorerUrl: z.string(),
  isTestnet: z.boolean(),
  chainType: ChainTypeSchema,
});
export type ChainInfo = z.infer<typeof ChainInfoSchema>;

// Chain ID to name mapping
export const CHAIN_IDS: Record<Chain, number> = {
  ethereum: 1,
  base: 8453,
  monad: 143,
  sepolia: 11155111,
  "base-sepolia": 84532,
  "tempo-testnet": 42431,
  tempo: 4217,
  solana: 101,
  "solana-devnet": 102,
};

// Chain name to ID mapping
export const CHAIN_NAMES: Record<number, Chain> = Object.fromEntries(
  Object.entries(CHAIN_IDS).map(([name, id]) => [id, name as Chain])
) as Record<number, Chain>;
