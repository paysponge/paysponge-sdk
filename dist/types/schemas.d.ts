import { z } from "zod";
export declare const ChainSchema: z.ZodEnum<["ethereum", "base", "monad", "sepolia", "base-sepolia", "tempo-testnet", "tempo", "solana", "solana-devnet"]>;
export type Chain = z.infer<typeof ChainSchema>;
export declare const ChainTypeSchema: z.ZodEnum<["evm", "solana"]>;
export type ChainType = z.infer<typeof ChainTypeSchema>;
export declare const CurrencySchema: z.ZodString;
export type Currency = z.infer<typeof CurrencySchema>;
export declare const EvmChainSchema: z.ZodEnum<["ethereum", "base", "monad", "sepolia", "base-sepolia"]>;
export type EvmChain = z.infer<typeof EvmChainSchema>;
export declare const SolanaChainSchema: z.ZodEnum<["solana", "solana-devnet"]>;
export type SolanaChain = z.infer<typeof SolanaChainSchema>;
export declare const MainnetChainSchema: z.ZodEnum<["ethereum", "base", "monad", "tempo", "solana"]>;
export type MainnetChain = z.infer<typeof MainnetChainSchema>;
export declare const TestnetChainSchema: z.ZodEnum<["sepolia", "base-sepolia", "tempo-testnet", "solana-devnet"]>;
export type TestnetChain = z.infer<typeof TestnetChainSchema>;
export declare const EthereumAddressSchema: z.ZodString;
export declare const SolanaAddressSchema: z.ZodString;
export declare const AddressSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const ConnectOptionsSchema: z.ZodObject<{
    /** Agent name (creates new agent if doesn't exist) */
    name: z.ZodOptional<z.ZodString>;
    /** Existing agent ID to connect to */
    agentId: z.ZodOptional<z.ZodString>;
    /** API key to use (skips device flow) */
    apiKey: z.ZodOptional<z.ZodString>;
    /** Use testnets only */
    testnet: z.ZodOptional<z.ZodBoolean>;
    /** Base URL for the API (defaults to production) */
    baseUrl: z.ZodOptional<z.ZodString>;
    /** Disable browser auto-open during device flow */
    noBrowser: z.ZodOptional<z.ZodBoolean>;
    /** Custom path to store credentials file (defaults to ~/.spongewallet/credentials.json) */
    credentialsPath: z.ZodOptional<z.ZodString>;
    /** Email to associate with the agent (used for claim matching) */
    email: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    agentId?: string | undefined;
    apiKey?: string | undefined;
    testnet?: boolean | undefined;
    baseUrl?: string | undefined;
    noBrowser?: boolean | undefined;
    credentialsPath?: string | undefined;
    email?: string | undefined;
}, {
    name?: string | undefined;
    agentId?: string | undefined;
    apiKey?: string | undefined;
    testnet?: boolean | undefined;
    baseUrl?: string | undefined;
    noBrowser?: boolean | undefined;
    credentialsPath?: string | undefined;
    email?: string | undefined;
}>;
export type ConnectOptions = z.infer<typeof ConnectOptionsSchema>;
export declare const PlatformConnectOptionsSchema: z.ZodObject<{
    /** Master API key to use for platform control-plane operations */
    apiKey: z.ZodOptional<z.ZodString>;
    /** Base URL for the API (defaults to production) */
    baseUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    apiKey?: string | undefined;
    baseUrl?: string | undefined;
}, {
    apiKey?: string | undefined;
    baseUrl?: string | undefined;
}>;
export type PlatformConnectOptions = z.infer<typeof PlatformConnectOptionsSchema>;
export declare const RegisterAgentOptionsSchema: z.ZodObject<{
    name: z.ZodString;
    agentFirst: z.ZodOptional<z.ZodBoolean>;
    testnet: z.ZodOptional<z.ZodBoolean>;
    claimRequired: z.ZodOptional<z.ZodBoolean>;
    email: z.ZodOptional<z.ZodString>;
    baseUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    testnet?: boolean | undefined;
    baseUrl?: string | undefined;
    email?: string | undefined;
    agentFirst?: boolean | undefined;
    claimRequired?: boolean | undefined;
}, {
    name: string;
    testnet?: boolean | undefined;
    baseUrl?: string | undefined;
    email?: string | undefined;
    agentFirst?: boolean | undefined;
    claimRequired?: boolean | undefined;
}>;
export type RegisterAgentOptions = z.infer<typeof RegisterAgentOptionsSchema>;
export declare const CreateAgentOptionsSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    dailySpendingLimit: z.ZodOptional<z.ZodString>;
    weeklySpendingLimit: z.ZodOptional<z.ZodString>;
    monthlySpendingLimit: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    dailySpendingLimit?: string | undefined;
    weeklySpendingLimit?: string | undefined;
    monthlySpendingLimit?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    dailySpendingLimit?: string | undefined;
    weeklySpendingLimit?: string | undefined;
    monthlySpendingLimit?: string | undefined;
}>;
export type CreateAgentOptions = z.infer<typeof CreateAgentOptionsSchema>;
export declare const PlatformCreateAgentOptionsSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    dailySpendingLimit: z.ZodOptional<z.ZodString>;
    weeklySpendingLimit: z.ZodOptional<z.ZodString>;
    monthlySpendingLimit: z.ZodOptional<z.ZodString>;
} & {
    isTestMode: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    dailySpendingLimit?: string | undefined;
    weeklySpendingLimit?: string | undefined;
    monthlySpendingLimit?: string | undefined;
    isTestMode?: boolean | undefined;
}, {
    name: string;
    description?: string | undefined;
    dailySpendingLimit?: string | undefined;
    weeklySpendingLimit?: string | undefined;
    monthlySpendingLimit?: string | undefined;
    isTestMode?: boolean | undefined;
}>;
export type PlatformCreateAgentOptions = z.infer<typeof PlatformCreateAgentOptionsSchema>;
export declare const AgentSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodEnum<["active", "paused", "suspended"]>;
    dailySpendingLimit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    weeklySpendingLimit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    monthlySpendingLimit: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "paused" | "suspended";
    name: string;
    id: string;
    createdAt: Date;
    description?: string | null | undefined;
    dailySpendingLimit?: string | null | undefined;
    weeklySpendingLimit?: string | null | undefined;
    monthlySpendingLimit?: string | null | undefined;
    updatedAt?: Date | null | undefined;
}, {
    status: "active" | "paused" | "suspended";
    name: string;
    id: string;
    createdAt: Date;
    description?: string | null | undefined;
    dailySpendingLimit?: string | null | undefined;
    weeklySpendingLimit?: string | null | undefined;
    monthlySpendingLimit?: string | null | undefined;
    updatedAt?: Date | null | undefined;
}>;
export type Agent = z.infer<typeof AgentSchema>;
export declare const MasterApiKeySchema: z.ZodObject<{
    id: z.ZodString;
    keyPrefix: z.ZodString;
    keyName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    scopes: z.ZodArray<z.ZodString, "many">;
    isActive: z.ZodBoolean;
    usageCount: z.ZodNumber;
    lastUsedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    keyPrefix: string;
    scopes: string[];
    isActive: boolean;
    usageCount: number;
    keyName?: string | null | undefined;
    lastUsedAt?: Date | null | undefined;
    expiresAt?: Date | null | undefined;
}, {
    id: string;
    createdAt: Date;
    keyPrefix: string;
    scopes: string[];
    isActive: boolean;
    usageCount: number;
    keyName?: string | null | undefined;
    lastUsedAt?: Date | null | undefined;
    expiresAt?: Date | null | undefined;
}>;
export type MasterApiKey = z.infer<typeof MasterApiKeySchema>;
export declare const CreatedMasterApiKeySchema: z.ZodObject<{
    id: z.ZodString;
    apiKey: z.ZodString;
    keyName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    scopes: z.ZodArray<z.ZodString, "many">;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    apiKey: string;
    id: string;
    createdAt: Date;
    scopes: string[];
    keyName?: string | null | undefined;
}, {
    apiKey: string;
    id: string;
    createdAt: Date;
    scopes: string[];
    keyName?: string | null | undefined;
}>;
export type CreatedMasterApiKey = z.infer<typeof CreatedMasterApiKeySchema>;
export declare const WalletSchema: z.ZodObject<{
    id: z.ZodString;
    agentId: z.ZodString;
    chainId: z.ZodNumber;
    chainName: z.ZodString;
    chainType: z.ZodOptional<z.ZodEnum<["evm", "solana"]>>;
    address: z.ZodString;
    isActive: z.ZodBoolean;
    createdAt: z.ZodDate;
    balance: z.ZodOptional<z.ZodString>;
    balanceUsdValue: z.ZodOptional<z.ZodString>;
    symbol: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    agentId: string;
    id: string;
    createdAt: Date;
    isActive: boolean;
    chainId: number;
    chainName: string;
    address: string;
    symbol?: string | undefined;
    chainType?: "solana" | "evm" | undefined;
    balance?: string | undefined;
    balanceUsdValue?: string | undefined;
}, {
    agentId: string;
    id: string;
    createdAt: Date;
    isActive: boolean;
    chainId: number;
    chainName: string;
    address: string;
    symbol?: string | undefined;
    chainType?: "solana" | "evm" | undefined;
    balance?: string | undefined;
    balanceUsdValue?: string | undefined;
}>;
export type Wallet = z.infer<typeof WalletSchema>;
export declare const TokenBalanceSchema: z.ZodObject<{
    tokenAddress: z.ZodString;
    symbol: z.ZodString;
    name: z.ZodString;
    decimals: z.ZodNumber;
    balance: z.ZodString;
    formatted: z.ZodString;
    usdValue: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    name: string;
    balance: string;
    tokenAddress: string;
    decimals: number;
    formatted: string;
    usdValue?: string | undefined;
}, {
    symbol: string;
    name: string;
    balance: string;
    tokenAddress: string;
    decimals: number;
    formatted: string;
    usdValue?: string | undefined;
}>;
export type TokenBalance = z.infer<typeof TokenBalanceSchema>;
export declare const BalanceSchema: z.ZodRecord<z.ZodString, z.ZodString>;
export type Balance = z.infer<typeof BalanceSchema>;
export declare const AllBalancesSchema: z.ZodRecord<z.ZodEnum<["ethereum", "base", "monad", "sepolia", "base-sepolia", "tempo-testnet", "tempo", "solana", "solana-devnet"]>, z.ZodRecord<z.ZodString, z.ZodString>>;
export type AllBalances = z.infer<typeof AllBalancesSchema>;
export declare const TransferOptionsSchema: z.ZodEffects<z.ZodObject<{
    chain: z.ZodEnum<["ethereum", "base", "monad", "sepolia", "base-sepolia", "tempo-testnet", "tempo", "solana", "solana-devnet"]>;
    to: z.ZodEffects<z.ZodString, string, string>;
    amount: z.ZodString;
    currency: z.ZodOptional<z.ZodString>;
    token: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    chain: "ethereum" | "base" | "monad" | "sepolia" | "base-sepolia" | "tempo-testnet" | "tempo" | "solana" | "solana-devnet";
    to: string;
    amount: string;
    currency?: string | undefined;
    token?: string | undefined;
}, {
    chain: "ethereum" | "base" | "monad" | "sepolia" | "base-sepolia" | "tempo-testnet" | "tempo" | "solana" | "solana-devnet";
    to: string;
    amount: string;
    currency?: string | undefined;
    token?: string | undefined;
}>, {
    chain: "ethereum" | "base" | "monad" | "sepolia" | "base-sepolia" | "tempo-testnet" | "tempo" | "solana" | "solana-devnet";
    to: string;
    amount: string;
    currency?: string | undefined;
    token?: string | undefined;
}, {
    chain: "ethereum" | "base" | "monad" | "sepolia" | "base-sepolia" | "tempo-testnet" | "tempo" | "solana" | "solana-devnet";
    to: string;
    amount: string;
    currency?: string | undefined;
    token?: string | undefined;
}>;
export type TransferOptions = z.infer<typeof TransferOptionsSchema>;
export declare const TransactionResultSchema: z.ZodObject<{
    txHash: z.ZodString;
    status: z.ZodEnum<["pending", "confirmed", "failed"]>;
    explorerUrl: z.ZodOptional<z.ZodString>;
    chainId: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "confirmed" | "failed";
    txHash: string;
    chainId?: number | undefined;
    explorerUrl?: string | undefined;
}, {
    status: "pending" | "confirmed" | "failed";
    txHash: string;
    chainId?: number | undefined;
    explorerUrl?: string | undefined;
}>;
export type TransactionResult = z.infer<typeof TransactionResultSchema>;
export declare const TransactionStatusSchema: z.ZodObject<{
    txHash: z.ZodString;
    status: z.ZodEnum<["pending", "confirmed", "failed", "unknown"]>;
    blockNumber: z.ZodNullable<z.ZodNumber>;
    confirmations: z.ZodNullable<z.ZodNumber>;
    errorMessage: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "unknown" | "pending" | "confirmed" | "failed";
    txHash: string;
    blockNumber: number | null;
    confirmations: number | null;
    errorMessage: string | null;
}, {
    status: "unknown" | "pending" | "confirmed" | "failed";
    txHash: string;
    blockNumber: number | null;
    confirmations: number | null;
    errorMessage: string | null;
}>;
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;
export declare const SwapOptionsSchema: z.ZodObject<{
    chain: z.ZodUnion<[z.ZodLiteral<"solana">, z.ZodLiteral<"solana-devnet">]>;
    from: z.ZodString;
    to: z.ZodString;
    amount: z.ZodString;
    slippageBps: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    chain: "solana" | "solana-devnet";
    to: string;
    amount: string;
    from: string;
    slippageBps?: number | undefined;
}, {
    chain: "solana" | "solana-devnet";
    to: string;
    amount: string;
    from: string;
    slippageBps?: number | undefined;
}>;
export type SwapOptions = z.infer<typeof SwapOptionsSchema>;
export declare const DetailedTokenBalanceSchema: z.ZodObject<{
    token: z.ZodString;
    amount: z.ZodString;
    usdValue: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount: string;
    token: string;
    usdValue?: string | undefined;
}, {
    amount: string;
    token: string;
    usdValue?: string | undefined;
}>;
export type DetailedTokenBalance = z.infer<typeof DetailedTokenBalanceSchema>;
export declare const DetailedChainBalanceSchema: z.ZodObject<{
    address: z.ZodString;
    balances: z.ZodArray<z.ZodObject<{
        token: z.ZodString;
        amount: z.ZodString;
        usdValue: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        amount: string;
        token: string;
        usdValue?: string | undefined;
    }, {
        amount: string;
        token: string;
        usdValue?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    address: string;
    balances: {
        amount: string;
        token: string;
        usdValue?: string | undefined;
    }[];
}, {
    address: string;
    balances: {
        amount: string;
        token: string;
        usdValue?: string | undefined;
    }[];
}>;
export type DetailedChainBalance = z.infer<typeof DetailedChainBalanceSchema>;
export declare const DetailedBalancesSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    address: z.ZodString;
    balances: z.ZodArray<z.ZodObject<{
        token: z.ZodString;
        amount: z.ZodString;
        usdValue: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        amount: string;
        token: string;
        usdValue?: string | undefined;
    }, {
        amount: string;
        token: string;
        usdValue?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    address: string;
    balances: {
        amount: string;
        token: string;
        usdValue?: string | undefined;
    }[];
}, {
    address: string;
    balances: {
        amount: string;
        token: string;
        usdValue?: string | undefined;
    }[];
}>>;
export type DetailedBalances = z.infer<typeof DetailedBalancesSchema>;
export declare const EvmTransferOptionsSchema: z.ZodObject<{
    chain: z.ZodEnum<["ethereum", "base", "monad", "sepolia", "base-sepolia"]>;
    to: z.ZodString;
    amount: z.ZodString;
    currency: z.ZodEnum<["ETH", "USDC"]>;
}, "strip", z.ZodTypeAny, {
    chain: "ethereum" | "base" | "monad" | "sepolia" | "base-sepolia";
    to: string;
    amount: string;
    currency: "ETH" | "USDC";
}, {
    chain: "ethereum" | "base" | "monad" | "sepolia" | "base-sepolia";
    to: string;
    amount: string;
    currency: "ETH" | "USDC";
}>;
export type EvmTransferOptions = z.infer<typeof EvmTransferOptionsSchema>;
export declare const SolanaTransferOptionsSchema: z.ZodObject<{
    chain: z.ZodEnum<["solana", "solana-devnet"]>;
    to: z.ZodString;
    amount: z.ZodString;
    currency: z.ZodEnum<["SOL", "USDC"]>;
}, "strip", z.ZodTypeAny, {
    chain: "solana" | "solana-devnet";
    to: string;
    amount: string;
    currency: "USDC" | "SOL";
}, {
    chain: "solana" | "solana-devnet";
    to: string;
    amount: string;
    currency: "USDC" | "SOL";
}>;
export type SolanaTransferOptions = z.infer<typeof SolanaTransferOptionsSchema>;
export declare const SubmitTransactionSchema: z.ZodObject<{
    transactionHash: z.ZodString;
    status: z.ZodString;
    explorerUrl: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: string;
    transactionHash: string;
    message?: string | undefined;
    explorerUrl?: string | undefined;
}, {
    status: string;
    transactionHash: string;
    message?: string | undefined;
    explorerUrl?: string | undefined;
}>;
export type SubmitTransaction = z.infer<typeof SubmitTransactionSchema>;
export declare const SolanaTokensResponseSchema: z.ZodObject<{
    address: z.ZodString;
    tokens: z.ZodArray<z.ZodObject<{
        mint: z.ZodString;
        symbol: z.ZodString;
        name: z.ZodString;
        balance: z.ZodString;
        decimals: z.ZodNumber;
        logoURI: z.ZodNullable<z.ZodString>;
        verified: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        name: string;
        balance: string;
        decimals: number;
        mint: string;
        logoURI: string | null;
        verified: boolean;
    }, {
        symbol: string;
        name: string;
        balance: string;
        decimals: number;
        mint: string;
        logoURI: string | null;
        verified: boolean;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    address: string;
    tokens: {
        symbol: string;
        name: string;
        balance: string;
        decimals: number;
        mint: string;
        logoURI: string | null;
        verified: boolean;
    }[];
}, {
    address: string;
    tokens: {
        symbol: string;
        name: string;
        balance: string;
        decimals: number;
        mint: string;
        logoURI: string | null;
        verified: boolean;
    }[];
}>;
export type SolanaTokensResponse = z.infer<typeof SolanaTokensResponseSchema>;
export declare const SolanaTokenSearchResponseSchema: z.ZodObject<{
    tokens: z.ZodArray<z.ZodObject<{
        mint: z.ZodString;
        symbol: z.ZodString;
        name: z.ZodString;
        decimals: z.ZodNumber;
        logoURI: z.ZodNullable<z.ZodString>;
        verified: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        name: string;
        decimals: number;
        mint: string;
        logoURI: string | null;
        verified: boolean;
    }, {
        symbol: string;
        name: string;
        decimals: number;
        mint: string;
        logoURI: string | null;
        verified: boolean;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    tokens: {
        symbol: string;
        name: string;
        decimals: number;
        mint: string;
        logoURI: string | null;
        verified: boolean;
    }[];
}, {
    tokens: {
        symbol: string;
        name: string;
        decimals: number;
        mint: string;
        logoURI: string | null;
        verified: boolean;
    }[];
}>;
export type SolanaTokenSearchResponse = z.infer<typeof SolanaTokenSearchResponseSchema>;
export declare const OnrampCryptoOptionsSchema: z.ZodObject<{
    wallet_address: z.ZodString;
    provider: z.ZodOptional<z.ZodEnum<["auto", "stripe", "coinbase"]>>;
    chain: z.ZodOptional<z.ZodEnum<["base", "solana", "polygon"]>>;
    fiat_amount: z.ZodOptional<z.ZodString>;
    fiat_currency: z.ZodOptional<z.ZodString>;
    lock_wallet_address: z.ZodOptional<z.ZodBoolean>;
    redirect_url: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    wallet_address: string;
    chain?: "base" | "solana" | "polygon" | undefined;
    provider?: "auto" | "stripe" | "coinbase" | undefined;
    fiat_amount?: string | undefined;
    fiat_currency?: string | undefined;
    lock_wallet_address?: boolean | undefined;
    redirect_url?: string | undefined;
}, {
    wallet_address: string;
    chain?: "base" | "solana" | "polygon" | undefined;
    provider?: "auto" | "stripe" | "coinbase" | undefined;
    fiat_amount?: string | undefined;
    fiat_currency?: string | undefined;
    lock_wallet_address?: boolean | undefined;
    redirect_url?: string | undefined;
}>;
export type OnrampCryptoOptions = z.infer<typeof OnrampCryptoOptionsSchema>;
export declare const OnrampCryptoResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    provider: z.ZodEnum<["stripe", "coinbase"]>;
    url: z.ZodString;
    sessionId: z.ZodString;
    status: z.ZodLiteral<"initiated">;
    destinationChain: z.ZodEnum<["base", "solana", "polygon"]>;
    destinationAddress: z.ZodString;
    destinationCurrency: z.ZodLiteral<"USDC">;
    clientSecret: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "initiated";
    provider: "stripe" | "coinbase";
    success: true;
    url: string;
    sessionId: string;
    destinationChain: "base" | "solana" | "polygon";
    destinationAddress: string;
    destinationCurrency: "USDC";
    clientSecret?: string | undefined;
}, {
    status: "initiated";
    provider: "stripe" | "coinbase";
    success: true;
    url: string;
    sessionId: string;
    destinationChain: "base" | "solana" | "polygon";
    destinationAddress: string;
    destinationCurrency: "USDC";
    clientSecret?: string | undefined;
}>;
export type OnrampCryptoResponse = z.infer<typeof OnrampCryptoResponseSchema>;
export declare const SignupBonusClaimResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    amount: z.ZodString;
    currency: z.ZodLiteral<"USDC">;
    chain: z.ZodLiteral<"base">;
    recipientAddress: z.ZodString;
    transactionHash: z.ZodString;
    explorerUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    chain: "base";
    amount: string;
    currency: "USDC";
    explorerUrl: string;
    transactionHash: string;
    success: boolean;
    recipientAddress: string;
}, {
    message: string;
    chain: "base";
    amount: string;
    currency: "USDC";
    explorerUrl: string;
    transactionHash: string;
    success: boolean;
    recipientAddress: string;
}>;
export type SignupBonusClaimResponse = z.infer<typeof SignupBonusClaimResponseSchema>;
export declare const TransactionHistoryDetailedSchema: z.ZodObject<{
    transactions: z.ZodArray<z.ZodObject<{
        txHash: z.ZodNullable<z.ZodString>;
        status: z.ZodString;
        from: z.ZodString;
        to: z.ZodString;
        value: z.ZodString;
        token: z.ZodString;
        direction: z.ZodString;
        chain: z.ZodString;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        status: string;
        chain: string;
        to: string;
        token: string;
        txHash: string | null;
        from: string;
        direction: string;
        timestamp: string;
    }, {
        value: string;
        status: string;
        chain: string;
        to: string;
        token: string;
        txHash: string | null;
        from: string;
        direction: string;
        timestamp: string;
    }>, "many">;
    total: z.ZodNumber;
    hasMore: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    transactions: {
        value: string;
        status: string;
        chain: string;
        to: string;
        token: string;
        txHash: string | null;
        from: string;
        direction: string;
        timestamp: string;
    }[];
    total: number;
    hasMore: boolean;
}, {
    transactions: {
        value: string;
        status: string;
        chain: string;
        to: string;
        token: string;
        txHash: string | null;
        from: string;
        direction: string;
        timestamp: string;
    }[];
    total: number;
    hasMore: boolean;
}>;
export type TransactionHistoryDetailed = z.infer<typeof TransactionHistoryDetailedSchema>;
export declare const SpongeResponseSchema: z.ZodObject<{
    summary: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["success", "payment_required", "error"]>;
    task: z.ZodString;
    provider: z.ZodString;
    data: z.ZodOptional<z.ZodUnknown>;
    image_data: z.ZodOptional<z.ZodString>;
    image_mime_type: z.ZodOptional<z.ZodString>;
    payment: z.ZodOptional<z.ZodObject<{
        chain: z.ZodString;
        to: z.ZodString;
        token: z.ZodString;
        amount: z.ZodString;
        raw_amount: z.ZodString;
        decimals: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        decimals: number;
        chain: string;
        to: string;
        amount: string;
        token: string;
        raw_amount: string;
    }, {
        decimals: number;
        chain: string;
        to: string;
        amount: string;
        token: string;
        raw_amount: string;
    }>>;
    payment_made: z.ZodOptional<z.ZodObject<{
        chain: z.ZodString;
        to: z.ZodString;
        amount: z.ZodString;
        token: z.ZodString;
        expiresAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        expiresAt: string;
        chain: string;
        to: string;
        amount: string;
        token: string;
    }, {
        expiresAt: string;
        chain: string;
        to: string;
        amount: string;
        token: string;
    }>>;
    wallet_balance: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        address: z.ZodString;
        balances: z.ZodArray<z.ZodObject<{
            token: z.ZodString;
            amount: z.ZodString;
            usdValue: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            amount: string;
            token: string;
            usdValue?: string | undefined;
        }, {
            amount: string;
            token: string;
            usdValue?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        address: string;
        balances: {
            amount: string;
            token: string;
            usdValue?: string | undefined;
        }[];
    }, {
        address: string;
        balances: {
            amount: string;
            token: string;
            usdValue?: string | undefined;
        }[];
    }>>>;
    next_step: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
    api_error_details: z.ZodOptional<z.ZodUnknown>;
    receipt: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    status: "success" | "payment_required" | "error";
    provider: string;
    task: string;
    summary?: string | undefined;
    error?: string | undefined;
    data?: unknown;
    image_data?: string | undefined;
    image_mime_type?: string | undefined;
    payment?: {
        decimals: number;
        chain: string;
        to: string;
        amount: string;
        token: string;
        raw_amount: string;
    } | undefined;
    payment_made?: {
        expiresAt: string;
        chain: string;
        to: string;
        amount: string;
        token: string;
    } | undefined;
    wallet_balance?: Record<string, {
        address: string;
        balances: {
            amount: string;
            token: string;
            usdValue?: string | undefined;
        }[];
    }> | undefined;
    next_step?: string | undefined;
    api_error_details?: unknown;
    receipt?: unknown;
}, {
    status: "success" | "payment_required" | "error";
    provider: string;
    task: string;
    summary?: string | undefined;
    error?: string | undefined;
    data?: unknown;
    image_data?: string | undefined;
    image_mime_type?: string | undefined;
    payment?: {
        decimals: number;
        chain: string;
        to: string;
        amount: string;
        token: string;
        raw_amount: string;
    } | undefined;
    payment_made?: {
        expiresAt: string;
        chain: string;
        to: string;
        amount: string;
        token: string;
    } | undefined;
    wallet_balance?: Record<string, {
        address: string;
        balances: {
            amount: string;
            token: string;
            usdValue?: string | undefined;
        }[];
    }> | undefined;
    next_step?: string | undefined;
    api_error_details?: unknown;
    receipt?: unknown;
}>;
export type SpongeResponse = z.infer<typeof SpongeResponseSchema>;
export declare const X402PaymentResponseSchema: z.ZodObject<{
    paymentPayload: z.ZodUnknown;
    paymentPayloadBase64: z.ZodString;
    headerName: z.ZodOptional<z.ZodString>;
    paymentRequirements: z.ZodObject<{
        scheme: z.ZodLiteral<"exact">;
        network: z.ZodString;
        maxAmountRequired: z.ZodString;
        asset: z.ZodString;
        payTo: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        scheme: "exact";
        network: string;
        maxAmountRequired: string;
        asset: string;
        payTo: string;
    }, {
        scheme: "exact";
        network: string;
        maxAmountRequired: string;
        asset: string;
        payTo: string;
    }>;
    expiresAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    expiresAt: string;
    paymentPayloadBase64: string;
    paymentRequirements: {
        scheme: "exact";
        network: string;
        maxAmountRequired: string;
        asset: string;
        payTo: string;
    };
    paymentPayload?: unknown;
    headerName?: string | undefined;
}, {
    expiresAt: string;
    paymentPayloadBase64: string;
    paymentRequirements: {
        scheme: "exact";
        network: string;
        maxAmountRequired: string;
        asset: string;
        payTo: string;
    };
    paymentPayload?: unknown;
    headerName?: string | undefined;
}>;
export type X402PaymentResponse = z.infer<typeof X402PaymentResponseSchema>;
export declare const DeviceCodeResponseSchema: z.ZodObject<{
    deviceCode: z.ZodString;
    userCode: z.ZodString;
    verificationUri: z.ZodString;
    expiresIn: z.ZodNumber;
    interval: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
}, {
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
}>;
export type DeviceCodeResponse = z.infer<typeof DeviceCodeResponseSchema>;
export declare const TokenResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    tokenType: z.ZodLiteral<"Bearer">;
    expiresIn: z.ZodOptional<z.ZodNumber>;
    refreshToken: z.ZodOptional<z.ZodString>;
    agentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    apiKey: z.ZodString;
    keyType: z.ZodOptional<z.ZodEnum<["agent", "master"]>>;
}, "strip", z.ZodTypeAny, {
    apiKey: string;
    accessToken: string;
    tokenType: "Bearer";
    agentId?: string | null | undefined;
    expiresIn?: number | undefined;
    refreshToken?: string | undefined;
    keyType?: "agent" | "master" | undefined;
}, {
    apiKey: string;
    accessToken: string;
    tokenType: "Bearer";
    agentId?: string | null | undefined;
    expiresIn?: number | undefined;
    refreshToken?: string | undefined;
    keyType?: "agent" | "master" | undefined;
}>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export declare const DeviceFlowErrorSchema: z.ZodObject<{
    error: z.ZodEnum<["authorization_pending", "slow_down", "access_denied", "expired_token"]>;
    errorDescription: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    error: "authorization_pending" | "slow_down" | "access_denied" | "expired_token";
    errorDescription?: string | undefined;
}, {
    error: "authorization_pending" | "slow_down" | "access_denied" | "expired_token";
    errorDescription?: string | undefined;
}>;
export type DeviceFlowError = z.infer<typeof DeviceFlowErrorSchema>;
export declare const AgentRegistrationResponseSchema: z.ZodObject<{
    deviceCode: z.ZodString;
    userCode: z.ZodString;
    verificationUri: z.ZodString;
    verificationUriComplete: z.ZodString;
    expiresIn: z.ZodNumber;
    interval: z.ZodNumber;
    claimCode: z.ZodString;
    claimText: z.ZodNullable<z.ZodString>;
    agentId: z.ZodNullable<z.ZodString>;
    apiKey: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    agentId: string | null;
    apiKey: string | null;
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
    verificationUriComplete: string;
    claimCode: string;
    claimText: string | null;
}, {
    agentId: string | null;
    apiKey: string | null;
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
    verificationUriComplete: string;
    claimCode: string;
    claimText: string | null;
}>;
export type AgentRegistrationResponse = z.infer<typeof AgentRegistrationResponseSchema>;
export declare const AgentFirstRegistrationResponseSchema: z.ZodObject<{
    deviceCode: z.ZodString;
    userCode: z.ZodString;
    verificationUri: z.ZodString;
    verificationUriComplete: z.ZodString;
    expiresIn: z.ZodNumber;
    interval: z.ZodNumber;
    claimCode: z.ZodString;
    claimText: z.ZodNullable<z.ZodString>;
} & {
    agentId: z.ZodString;
    apiKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    agentId: string;
    apiKey: string;
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
    verificationUriComplete: string;
    claimCode: string;
    claimText: string | null;
}, {
    agentId: string;
    apiKey: string;
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
    verificationUriComplete: string;
    claimCode: string;
    claimText: string | null;
}>;
export type AgentFirstRegistrationResponse = z.infer<typeof AgentFirstRegistrationResponseSchema>;
export declare const CredentialsSchema: z.ZodObject<{
    apiKey: z.ZodString;
    agentId: z.ZodString;
    agentName: z.ZodOptional<z.ZodString>;
    testnet: z.ZodOptional<z.ZodBoolean>;
    createdAt: z.ZodDate;
    baseUrl: z.ZodOptional<z.ZodString>;
    claimCode: z.ZodOptional<z.ZodString>;
    claimUrl: z.ZodOptional<z.ZodString>;
    claimText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    agentId: string;
    apiKey: string;
    createdAt: Date;
    testnet?: boolean | undefined;
    baseUrl?: string | undefined;
    claimCode?: string | undefined;
    claimText?: string | null | undefined;
    agentName?: string | undefined;
    claimUrl?: string | undefined;
}, {
    agentId: string;
    apiKey: string;
    createdAt: Date;
    testnet?: boolean | undefined;
    baseUrl?: string | undefined;
    claimCode?: string | undefined;
    claimText?: string | null | undefined;
    agentName?: string | undefined;
    claimUrl?: string | undefined;
}>;
export type Credentials = z.infer<typeof CredentialsSchema>;
export declare const McpConfigSchema: z.ZodObject<{
    url: z.ZodString;
    headers: z.ZodRecord<z.ZodString, z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    headers: Record<string, string>;
}, {
    url: string;
    headers: Record<string, string>;
}>;
export type McpConfig = z.infer<typeof McpConfigSchema>;
export declare const ToolInputSchema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
export type ToolInput = z.infer<typeof ToolInputSchema>;
export declare const ToolResultSchema: z.ZodDiscriminatedUnion<"status", [z.ZodObject<{
    status: z.ZodLiteral<"success">;
    data: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    status: "success";
    data?: unknown;
}, {
    status: "success";
    data?: unknown;
}>, z.ZodObject<{
    status: z.ZodLiteral<"error">;
    error: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "error";
    error: string;
}, {
    status: "error";
    error: string;
}>]>;
export type ToolResult = z.infer<typeof ToolResultSchema>;
export declare const ApiErrorSchema: z.ZodObject<{
    error: z.ZodString;
    message: z.ZodString;
    statusCode: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    message: string;
    error: string;
    statusCode: number;
}, {
    message: string;
    error: string;
    statusCode: number;
}>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export declare const ChainInfoSchema: z.ZodObject<{
    chainId: z.ZodNumber;
    name: z.ZodString;
    symbol: z.ZodString;
    explorerUrl: z.ZodString;
    isTestnet: z.ZodBoolean;
    chainType: z.ZodEnum<["evm", "solana"]>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    name: string;
    chainId: number;
    chainType: "solana" | "evm";
    explorerUrl: string;
    isTestnet: boolean;
}, {
    symbol: string;
    name: string;
    chainId: number;
    chainType: "solana" | "evm";
    explorerUrl: string;
    isTestnet: boolean;
}>;
export type ChainInfo = z.infer<typeof ChainInfoSchema>;
export declare const CHAIN_IDS: Record<Chain, number>;
export declare const CHAIN_NAMES: Record<number, Chain>;
//# sourceMappingURL=schemas.d.ts.map