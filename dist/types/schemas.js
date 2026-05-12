import { z } from "zod";
// ============================================================================
// Chain Types
// ============================================================================
export const ChainSchema = z.enum([
    "ethereum",
    "base",
    "monad",
    "polygon",
    "sepolia",
    "base-sepolia",
    "polygon-amoy",
    "tempo-testnet",
    "tempo",
    "solana",
    "solana-devnet",
]);
export const ChainTypeSchema = z.enum(["evm", "solana"]);
export const CurrencySchema = z.string();
export const EvmChainSchema = z.enum([
    "ethereum",
    "base",
    "monad",
    "polygon",
    "sepolia",
    "base-sepolia",
    "polygon-amoy",
]);
export const SolanaChainSchema = z.enum(["solana", "solana-devnet"]);
// Mainnet chains only
export const MainnetChainSchema = z.enum(["ethereum", "base", "monad", "polygon", "tempo", "solana"]);
// Testnet chains only
export const TestnetChainSchema = z.enum([
    "sepolia",
    "base-sepolia",
    "polygon-amoy",
    "tempo-testnet",
    "solana-devnet",
]);
// ============================================================================
// Address Validation
// ============================================================================
export const EthereumAddressSchema = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");
export const SolanaAddressSchema = z
    .string()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Solana address");
export const AddressSchema = z.string().refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val) ||
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val), { message: "Invalid address" });
// ============================================================================
// Connect Options
// ============================================================================
export const ConnectOptionsSchema = z.object({
    /** Agent name (creates new agent if doesn't exist) */
    name: z.string().min(1).max(255).optional(),
    /** Existing agent ID to connect to */
    agentId: z.string().uuid().optional(),
    /** API key to use (skips the browser auth flow) */
    apiKey: z.string().optional(),
    /** Use testnets only */
    testnet: z.boolean().optional(),
    /** Base URL for the API (defaults to production) */
    baseUrl: z.string().url().optional(),
    /** Disable browser auto-open during the browser auth flow */
    noBrowser: z.boolean().optional(),
    /** Custom path to store credentials file (defaults to ~/.spongewallet/credentials.json) */
    credentialsPath: z.string().optional(),
    /** Email to associate with the agent (used for claim matching) */
    email: z.string().email().optional(),
});
export const PlatformConnectOptionsSchema = z.object({
    /** Master API key to use for platform control-plane operations */
    apiKey: z.string().optional(),
    /** Base URL for the API (defaults to production) */
    baseUrl: z.string().url().optional(),
});
export const RegisterAgentOptionsSchema = z.object({
    name: z.string().min(1).max(255),
    agentFirst: z.boolean().optional(),
    testnet: z.boolean().optional(),
    claimRequired: z.boolean().optional(),
    email: z.string().email().optional(),
    baseUrl: z.string().url().optional(),
});
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
export const PlatformCreateAgentOptionsSchema = CreateAgentOptionsSchema.extend({
    isTestMode: z.boolean().optional(),
});
export const PlatformFleetSpendingLimitOptionsSchema = z.object({
    agentIds: z.array(z.string().uuid()).optional(),
    dailySpendingLimit: z.string().optional(),
    weeklySpendingLimit: z.string().optional(),
    monthlySpendingLimit: z.string().optional(),
}).refine((value) => Boolean(value.dailySpendingLimit
    || value.weeklySpendingLimit
    || value.monthlySpendingLimit), {
    message: "At least one spending limit is required",
});
export const PlatformFleetSpendingLimitFailureSchema = z.object({
    agentId: z.string().uuid(),
    error: z.string(),
});
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
export const PlatformFleetSpendingLimitResultSchema = z.object({
    updated: z.array(AgentSchema),
    failed: z.array(PlatformFleetSpendingLimitFailureSchema),
});
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
export const CreatedMasterApiKeySchema = z.object({
    id: z.string().uuid(),
    apiKey: z.string(),
    keyName: z.string().nullish(),
    scopes: z.array(z.string()),
    createdAt: z.coerce.date(),
});
export const BridgeCustomerEndorsementRequirementSchema = z.object({
    complete: z.array(z.string()),
    pending: z.array(z.string()),
    missing: z.unknown().nullable(),
    issues: z.array(z.string()),
});
export const BridgeCustomerEndorsementSchema = z.object({
    name: z.string(),
    status: z.string(),
    requirements: BridgeCustomerEndorsementRequirementSchema.nullable(),
    additionalRequirements: z.array(z.string()),
});
export const BridgeCustomerSchema = z.object({
    id: z.string(),
    bridgeCustomerId: z.string(),
    kycLinkId: z.string().nullable(),
    status: z.string().nullable(),
    kycStatus: z.string().nullable(),
    tosStatus: z.string().nullable(),
    hasAcceptedTermsOfService: z.boolean(),
    capabilities: z.record(z.string()),
    endorsements: z.array(BridgeCustomerEndorsementSchema),
    requestedWalletId: z.string().nullable(),
    requestedAt: z.coerce.date().nullable(),
    livemode: z.boolean(),
    hostedLinkUrl: z.string().nullable(),
    tosLinkUrl: z.string().nullable(),
    customerType: z.string().nullable(),
    updatedAt: z.coerce.date(),
});
export const BridgeKycLinkResponseSchema = z.object({
    url: z.string(),
    customer: BridgeCustomerSchema,
});
export const BridgeExternalAccountSchema = z.object({
    id: z.string(),
    bridgeExternalAccountId: z.string(),
    bridgeCustomerId: z.string(),
    currency: z.string(),
    last4: z.string().nullable(),
    active: z.boolean(),
    livemode: z.boolean(),
    bankName: z.string().nullable(),
    accountType: z.string().nullable(),
    accountOwnerType: z.string().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
export const BridgeVirtualAccountActivitySchema = z.object({
    id: z.string(),
    bridgeEventId: z.string(),
    type: z.string(),
    status: z.string().nullable(),
    amount: z.string().nullable(),
    currency: z.string().nullable(),
    receiptTxHash: z.string().nullable(),
    eventCreatedAt: z.coerce.date().nullable(),
    createdAt: z.coerce.date(),
});
export const BridgeVirtualAccountSchema = z.object({
    id: z.string(),
    bridgeVirtualAccountId: z.string(),
    bridgeCustomerId: z.string(),
    walletId: z.string(),
    status: z.string().nullable(),
    sourceCurrency: z.string(),
    destinationCurrency: z.string(),
    destinationPaymentRail: z.string(),
    destinationAddress: z.string(),
    depositInstructions: z.record(z.unknown()).nullable(),
    activities: z.array(BridgeVirtualAccountActivitySchema),
    accountReadyNotifiedAt: z.coerce.date().nullable(),
    livemode: z.boolean(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
export const BridgeTransferSchema = z.object({
    id: z.string(),
    bridgeTransferId: z.string(),
    bridgeCustomerId: z.string(),
    bridgeExternalAccountId: z.string(),
    walletId: z.string(),
    status: z.string(),
    amount: z.string(),
    sourceCurrency: z.string(),
    sourcePaymentRail: z.string(),
    destinationCurrency: z.string(),
    destinationPaymentRail: z.string(),
    fundingTxHash: z.string().nullable(),
    fundingExplorerUrl: z.string().nullable(),
    failureReason: z.string().nullable(),
    receiptUrl: z.string().nullable(),
    depositInstructions: z.record(z.unknown()).nullable(),
    isStaticTemplate: z.boolean(),
    livemode: z.boolean(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});
export const BridgeCustomerTypeSchema = z.enum(["individual", "business"]);
export const BridgeCreateKycLinkOptionsSchema = z.object({
    walletId: z.string().optional(),
    redirectUri: z.string().optional(),
    customerType: BridgeCustomerTypeSchema.optional(),
    agentId: z.string().optional(),
});
export const BridgeCreateExternalAccountOptionsSchema = z.object({
    customerId: z.string().optional(),
    bankName: z.string(),
    accountOwnerName: z.string(),
    routingNumber: z.string(),
    accountNumber: z.string(),
    checkingOrSavings: z.enum(["checking", "savings"]),
    streetLine1: z.string(),
    streetLine2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string().optional(),
    agentId: z.string().optional(),
});
export const BridgeCreateTransferOptionsSchema = z.object({
    walletId: z.string(),
    externalAccountId: z.string(),
    amount: z.string(),
    destinationPaymentRail: z.enum(["ach", "wire"]).optional(),
    agentId: z.string().optional(),
});
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
export const TokenBalanceSchema = z.object({
    tokenAddress: z.string(),
    symbol: z.string(),
    name: z.string(),
    decimals: z.number(),
    balance: z.string(),
    formatted: z.string(),
    usdValue: z.string().optional(),
});
export const BalanceSchema = z.record(z.string()); // e.g., { ETH: "0.5", USDC: "100.00" }
export const AllBalancesSchema = z.record(ChainSchema, BalanceSchema);
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
export const TransactionResultSchema = z.object({
    txHash: z.string(),
    status: z.enum(["pending", "confirmed", "failed"]),
    explorerUrl: z.string().optional(),
    chainId: z.number().optional(),
});
export const TransactionStatusSchema = z.object({
    txHash: z.string(),
    status: z.enum(["pending", "confirmed", "failed", "unknown"]),
    blockNumber: z.number().nullable(),
    confirmations: z.number().nullable(),
    errorMessage: z.string().nullable(),
});
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
export const TempoSwapOptionsSchema = z.object({
    chain: z.literal("tempo").or(z.literal("tempo-testnet")),
    from: z.string(),
    to: z.string(),
    amount: z.string(),
    slippageBps: z.number().min(0).max(10000).optional(),
});
// ============================================================================
// Public Tool Types (REST API helpers)
// ============================================================================
export const DetailedTokenBalanceSchema = z.object({
    token: z.string(),
    amount: z.string(),
    usdValue: z.string().optional(),
});
export const DetailedChainBalanceSchema = z.object({
    address: z.string(),
    balances: z.array(DetailedTokenBalanceSchema),
});
export const DetailedBalancesSchema = z.record(z.string(), DetailedChainBalanceSchema);
export const EvmTransferOptionsSchema = z.object({
    chain: EvmChainSchema,
    to: EthereumAddressSchema,
    amount: z.string(),
    currency: z.enum(["ETH", "POL", "USDC"]),
});
export const SolanaTransferOptionsSchema = z.object({
    chain: SolanaChainSchema,
    to: SolanaAddressSchema,
    amount: z.string(),
    currency: z.enum(["SOL", "USDC"]),
});
export const SubmitTransactionSchema = z.object({
    transactionHash: z.string(),
    status: z.string(),
    explorerUrl: z.string().optional(),
    message: z.string().optional(),
});
export const SolanaTokensResponseSchema = z.object({
    address: z.string(),
    tokens: z.array(z.object({
        mint: z.string(),
        symbol: z.string(),
        name: z.string(),
        balance: z.string(),
        decimals: z.number(),
        logoURI: z.string().nullable(),
        verified: z.boolean(),
    })),
});
export const SolanaTokenSearchResponseSchema = z.object({
    tokens: z.array(z.object({
        mint: z.string(),
        symbol: z.string(),
        name: z.string(),
        decimals: z.number(),
        logoURI: z.string().nullable(),
        verified: z.boolean(),
    })),
});
export const OnrampCryptoOptionsSchema = z.object({
    wallet_address: z.string(),
    provider: z.enum(["auto", "stripe", "coinbase"]).optional(),
    chain: z.enum(["base", "solana", "polygon"]).optional(),
    fiat_amount: z.string().optional(),
    fiat_currency: z.string().optional(),
    lock_wallet_address: z.boolean().optional(),
    redirect_url: z.string().optional(),
});
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
export const TransactionHistoryDetailedSchema = z.object({
    transactions: z.array(z.object({
        txHash: z.string().nullable(),
        status: z.string(),
        from: z.string(),
        to: z.string(),
        value: z.string(),
        token: z.string(),
        direction: z.string(),
        chain: z.string(),
        timestamp: z.string(),
    })),
    total: z.number(),
    hasMore: z.boolean(),
});
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
export const TokenResponseSchema = z.object({
    accessToken: z.string(),
    tokenType: z.literal("Bearer"),
    expiresIn: z.number().optional(),
    refreshToken: z.string().optional(),
    agentId: z.string().uuid().nullable().optional(),
    apiKey: z.string(), // The API key to save
    keyType: z.enum(["agent", "master"]).optional(),
});
export const DeviceFlowErrorSchema = z.object({
    error: z.enum([
        "authorization_pending",
        "slow_down",
        "access_denied",
        "expired_token",
    ]),
    errorDescription: z.string().optional(),
});
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
export const AgentFirstRegistrationResponseSchema = AgentRegistrationResponseSchema.extend({
    agentId: z.string().uuid(),
    apiKey: z.string(),
});
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
// ============================================================================
// MCP Config
// ============================================================================
export const McpConfigSchema = z.object({
    url: z.string().url(),
    headers: z.record(z.string()),
});
// ============================================================================
// Tool Types (for direct Anthropic SDK usage)
// ============================================================================
export const ToolInputSchema = z.record(z.unknown());
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
// ============================================================================
// API Error
// ============================================================================
export const ApiErrorSchema = z.object({
    error: z.string(),
    message: z.string(),
    statusCode: z.number().optional(),
});
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
// Chain ID to name mapping
export const CHAIN_IDS = {
    ethereum: 1,
    base: 8453,
    monad: 143,
    polygon: 137,
    sepolia: 11155111,
    "base-sepolia": 84532,
    "polygon-amoy": 80002,
    "tempo-testnet": 42431,
    tempo: 4217,
    solana: 101,
    "solana-devnet": 102,
};
// Chain name to ID mapping
export const CHAIN_NAMES = Object.fromEntries(Object.entries(CHAIN_IDS).map(([name, id]) => [id, name]));
//# sourceMappingURL=schemas.js.map