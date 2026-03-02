import { z } from 'zod';
export declare const zGetApiAgentsMeData: z.ZodObject<{
    body: z.ZodOptional<z.ZodNever>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodNever>;
}, "strip", z.ZodTypeAny, {
    path?: undefined;
    query?: undefined;
    body?: undefined;
}, {
    path?: undefined;
    query?: undefined;
    body?: undefined;
}>;
export declare const zGetApiAgentsData: z.ZodObject<{
    body: z.ZodOptional<z.ZodNever>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodObject<{
        includeBalances: z.ZodOptional<z.ZodString>;
        testMode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        includeBalances?: string | undefined;
        testMode?: string | undefined;
    }, {
        includeBalances?: string | undefined;
        testMode?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    path?: undefined;
    query?: {
        includeBalances?: string | undefined;
        testMode?: string | undefined;
    } | undefined;
    body?: undefined;
}, {
    path?: undefined;
    query?: {
        includeBalances?: string | undefined;
        testMode?: string | undefined;
    } | undefined;
    body?: undefined;
}>;
export declare const zPostApiAgentsData: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        agentType: z.ZodOptional<z.ZodString>;
        dailySpendingLimit: z.ZodOptional<z.ZodString>;
        weeklySpendingLimit: z.ZodOptional<z.ZodString>;
        monthlySpendingLimit: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        isTestMode: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description?: string | undefined;
        dailySpendingLimit?: string | undefined;
        weeklySpendingLimit?: string | undefined;
        monthlySpendingLimit?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
        agentType?: string | undefined;
        isTestMode?: boolean | undefined;
    }, {
        name: string;
        description?: string | undefined;
        dailySpendingLimit?: string | undefined;
        weeklySpendingLimit?: string | undefined;
        monthlySpendingLimit?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
        agentType?: string | undefined;
        isTestMode?: boolean | undefined;
    }>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodNever>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        description?: string | undefined;
        dailySpendingLimit?: string | undefined;
        weeklySpendingLimit?: string | undefined;
        monthlySpendingLimit?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
        agentType?: string | undefined;
        isTestMode?: boolean | undefined;
    };
    path?: undefined;
    query?: undefined;
}, {
    body: {
        name: string;
        description?: string | undefined;
        dailySpendingLimit?: string | undefined;
        weeklySpendingLimit?: string | undefined;
        monthlySpendingLimit?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
        agentType?: string | undefined;
        isTestMode?: boolean | undefined;
    };
    path?: undefined;
    query?: undefined;
}>;
export declare const zDeleteApiAgentsByIdData: z.ZodObject<{
    body: z.ZodOptional<z.ZodNever>;
    path: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    query: z.ZodOptional<z.ZodNever>;
}, "strip", z.ZodTypeAny, {
    path: {
        id: string;
    };
    query?: undefined;
    body?: undefined;
}, {
    path: {
        id: string;
    };
    query?: undefined;
    body?: undefined;
}>;
export declare const zGetApiAgentsByIdData: z.ZodObject<{
    body: z.ZodOptional<z.ZodNever>;
    path: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    query: z.ZodOptional<z.ZodObject<{
        includeBalances: z.ZodOptional<z.ZodString>;
        testMode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        includeBalances?: string | undefined;
        testMode?: string | undefined;
    }, {
        includeBalances?: string | undefined;
        testMode?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    path: {
        id: string;
    };
    query?: {
        includeBalances?: string | undefined;
        testMode?: string | undefined;
    } | undefined;
    body?: undefined;
}, {
    path: {
        id: string;
    };
    query?: {
        includeBalances?: string | undefined;
        testMode?: string | undefined;
    } | undefined;
    body?: undefined;
}>;
export declare const zPutApiAgentsByIdData: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        agentType: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        dailySpendingLimit: z.ZodOptional<z.ZodString>;
        weeklySpendingLimit: z.ZodOptional<z.ZodString>;
        monthlySpendingLimit: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        status?: string | undefined;
        name?: string | undefined;
        description?: string | undefined;
        dailySpendingLimit?: string | undefined;
        weeklySpendingLimit?: string | undefined;
        monthlySpendingLimit?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
        agentType?: string | undefined;
    }, {
        status?: string | undefined;
        name?: string | undefined;
        description?: string | undefined;
        dailySpendingLimit?: string | undefined;
        weeklySpendingLimit?: string | undefined;
        monthlySpendingLimit?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
        agentType?: string | undefined;
    }>;
    path: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    query: z.ZodOptional<z.ZodNever>;
}, "strip", z.ZodTypeAny, {
    path: {
        id: string;
    };
    body: {
        status?: string | undefined;
        name?: string | undefined;
        description?: string | undefined;
        dailySpendingLimit?: string | undefined;
        weeklySpendingLimit?: string | undefined;
        monthlySpendingLimit?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
        agentType?: string | undefined;
    };
    query?: undefined;
}, {
    path: {
        id: string;
    };
    body: {
        status?: string | undefined;
        name?: string | undefined;
        description?: string | undefined;
        dailySpendingLimit?: string | undefined;
        weeklySpendingLimit?: string | undefined;
        monthlySpendingLimit?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
        agentType?: string | undefined;
    };
    query?: undefined;
}>;
export declare const zGetApiWalletsData: z.ZodObject<{
    body: z.ZodOptional<z.ZodNever>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodObject<{
        agentId: z.ZodOptional<z.ZodString>;
        includeBalances: z.ZodOptional<z.ZodString>;
        testMode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        agentId?: string | undefined;
        includeBalances?: string | undefined;
        testMode?: string | undefined;
    }, {
        agentId?: string | undefined;
        includeBalances?: string | undefined;
        testMode?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    path?: undefined;
    query?: {
        agentId?: string | undefined;
        includeBalances?: string | undefined;
        testMode?: string | undefined;
    } | undefined;
    body?: undefined;
}, {
    path?: undefined;
    query?: {
        agentId?: string | undefined;
        includeBalances?: string | undefined;
        testMode?: string | undefined;
    } | undefined;
    body?: undefined;
}>;
export declare const zGetApiWalletsByIdData: z.ZodObject<{
    body: z.ZodOptional<z.ZodNever>;
    path: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    query: z.ZodOptional<z.ZodNever>;
}, "strip", z.ZodTypeAny, {
    path: {
        id: string;
    };
    query?: undefined;
    body?: undefined;
}, {
    path: {
        id: string;
    };
    query?: undefined;
    body?: undefined;
}>;
export declare const zGetApiWalletsByIdBalanceData: z.ZodObject<{
    body: z.ZodOptional<z.ZodNever>;
    path: z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>;
    query: z.ZodOptional<z.ZodObject<{
        chainId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        chainId?: string | undefined;
    }, {
        chainId?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    path: {
        id: string;
    };
    query?: {
        chainId?: string | undefined;
    } | undefined;
    body?: undefined;
}, {
    path: {
        id: string;
    };
    query?: {
        chainId?: string | undefined;
    } | undefined;
    body?: undefined;
}>;
export declare const zGetApiTransactionsData: z.ZodObject<{
    body: z.ZodOptional<z.ZodNever>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodObject<{
        agentId: z.ZodOptional<z.ZodString>;
        page: z.ZodOptional<z.ZodString>;
        perPage: z.ZodOptional<z.ZodString>;
        limit: z.ZodOptional<z.ZodString>;
        offset: z.ZodOptional<z.ZodString>;
        testMode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        agentId?: string | undefined;
        testMode?: string | undefined;
        page?: string | undefined;
        perPage?: string | undefined;
        limit?: string | undefined;
        offset?: string | undefined;
    }, {
        agentId?: string | undefined;
        testMode?: string | undefined;
        page?: string | undefined;
        perPage?: string | undefined;
        limit?: string | undefined;
        offset?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    path?: undefined;
    query?: {
        agentId?: string | undefined;
        testMode?: string | undefined;
        page?: string | undefined;
        perPage?: string | undefined;
        limit?: string | undefined;
        offset?: string | undefined;
    } | undefined;
    body?: undefined;
}, {
    path?: undefined;
    query?: {
        agentId?: string | undefined;
        testMode?: string | undefined;
        page?: string | undefined;
        perPage?: string | undefined;
        limit?: string | undefined;
        offset?: string | undefined;
    } | undefined;
    body?: undefined;
}>;
export declare const zPostApiTransactionsSwapData: z.ZodObject<{
    body: z.ZodObject<{
        chain: z.ZodString;
        inputToken: z.ZodString;
        outputToken: z.ZodString;
        amount: z.ZodString;
        slippageBps: z.ZodOptional<z.ZodNumber>;
        agentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        chain: string;
        amount: string;
        inputToken: string;
        outputToken: string;
        agentId?: string | undefined;
        slippageBps?: number | undefined;
    }, {
        chain: string;
        amount: string;
        inputToken: string;
        outputToken: string;
        agentId?: string | undefined;
        slippageBps?: number | undefined;
    }>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodNever>;
}, "strip", z.ZodTypeAny, {
    body: {
        chain: string;
        amount: string;
        inputToken: string;
        outputToken: string;
        agentId?: string | undefined;
        slippageBps?: number | undefined;
    };
    path?: undefined;
    query?: undefined;
}, {
    body: {
        chain: string;
        amount: string;
        inputToken: string;
        outputToken: string;
        agentId?: string | undefined;
        slippageBps?: number | undefined;
    };
    path?: undefined;
    query?: undefined;
}>;
export declare const zGetApiTransactionsStatusByTxHashData: z.ZodObject<{
    body: z.ZodOptional<z.ZodNever>;
    path: z.ZodObject<{
        txHash: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        txHash: string;
    }, {
        txHash: string;
    }>;
    query: z.ZodObject<{
        chain: z.ZodString;
        agentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        chain: string;
        agentId?: string | undefined;
    }, {
        chain: string;
        agentId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    path: {
        txHash: string;
    };
    query: {
        chain: string;
        agentId?: string | undefined;
    };
    body?: undefined;
}, {
    path: {
        txHash: string;
    };
    query: {
        chain: string;
        agentId?: string | undefined;
    };
    body?: undefined;
}>;
export declare const zGetApiBalancesData: z.ZodObject<{
    body: z.ZodOptional<z.ZodNever>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodObject<{
        chain: z.ZodOptional<z.ZodString>;
        allowedChains: z.ZodOptional<z.ZodString>;
        onlyUsdc: z.ZodOptional<z.ZodString>;
        agentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        agentId?: string | undefined;
        chain?: string | undefined;
        allowedChains?: string | undefined;
        onlyUsdc?: string | undefined;
    }, {
        agentId?: string | undefined;
        chain?: string | undefined;
        allowedChains?: string | undefined;
        onlyUsdc?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    path?: undefined;
    query?: {
        agentId?: string | undefined;
        chain?: string | undefined;
        allowedChains?: string | undefined;
        onlyUsdc?: string | undefined;
    } | undefined;
    body?: undefined;
}, {
    path?: undefined;
    query?: {
        agentId?: string | undefined;
        chain?: string | undefined;
        allowedChains?: string | undefined;
        onlyUsdc?: string | undefined;
    } | undefined;
    body?: undefined;
}>;
export declare const zPostApiTransfersEvmData: z.ZodObject<{
    body: z.ZodObject<{
        chain: z.ZodString;
        to: z.ZodString;
        amount: z.ZodString;
        currency: z.ZodEnum<["ETH", "USDC"]>;
        agentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        chain: string;
        to: string;
        amount: string;
        currency: "ETH" | "USDC";
        agentId?: string | undefined;
    }, {
        chain: string;
        to: string;
        amount: string;
        currency: "ETH" | "USDC";
        agentId?: string | undefined;
    }>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodNever>;
}, "strip", z.ZodTypeAny, {
    body: {
        chain: string;
        to: string;
        amount: string;
        currency: "ETH" | "USDC";
        agentId?: string | undefined;
    };
    path?: undefined;
    query?: undefined;
}, {
    body: {
        chain: string;
        to: string;
        amount: string;
        currency: "ETH" | "USDC";
        agentId?: string | undefined;
    };
    path?: undefined;
    query?: undefined;
}>;
export declare const zPostApiTransfersSolanaData: z.ZodObject<{
    body: z.ZodObject<{
        chain: z.ZodString;
        to: z.ZodString;
        amount: z.ZodString;
        currency: z.ZodEnum<["SOL", "USDC"]>;
        agentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        chain: string;
        to: string;
        amount: string;
        currency: "SOL" | "USDC";
        agentId?: string | undefined;
    }, {
        chain: string;
        to: string;
        amount: string;
        currency: "SOL" | "USDC";
        agentId?: string | undefined;
    }>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodNever>;
}, "strip", z.ZodTypeAny, {
    body: {
        chain: string;
        to: string;
        amount: string;
        currency: "SOL" | "USDC";
        agentId?: string | undefined;
    };
    path?: undefined;
    query?: undefined;
}, {
    body: {
        chain: string;
        to: string;
        amount: string;
        currency: "SOL" | "USDC";
        agentId?: string | undefined;
    };
    path?: undefined;
    query?: undefined;
}>;
export declare const zPostApiTransfersTempoData: z.ZodObject<{
    body: z.ZodObject<{
        chain: z.ZodOptional<z.ZodEnum<["tempo", "tempo-mainnet"]>>;
        to: z.ZodString;
        amount: z.ZodString;
        agentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        to: string;
        amount: string;
        agentId?: string | undefined;
        chain?: "tempo" | "tempo-mainnet" | undefined;
    }, {
        to: string;
        amount: string;
        agentId?: string | undefined;
        chain?: "tempo" | "tempo-mainnet" | undefined;
    }>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodNever>;
}, "strip", z.ZodTypeAny, {
    body: {
        to: string;
        amount: string;
        agentId?: string | undefined;
        chain?: "tempo" | "tempo-mainnet" | undefined;
    };
    path?: undefined;
    query?: undefined;
}, {
    body: {
        to: string;
        amount: string;
        agentId?: string | undefined;
        chain?: "tempo" | "tempo-mainnet" | undefined;
    };
    path?: undefined;
    query?: undefined;
}>;
export declare const zGetApiSolanaTokensData: z.ZodObject<{
    body: z.ZodOptional<z.ZodNever>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodObject<{
        chain: z.ZodString;
        agentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        chain: string;
        agentId?: string | undefined;
    }, {
        chain: string;
        agentId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        chain: string;
        agentId?: string | undefined;
    };
    path?: undefined;
    body?: undefined;
}, {
    query: {
        chain: string;
        agentId?: string | undefined;
    };
    path?: undefined;
    body?: undefined;
}>;
export declare const zGetApiSolanaTokensSearchData: z.ZodObject<{
    body: z.ZodOptional<z.ZodNever>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodObject<{
        query: z.ZodString;
        limit: z.ZodOptional<z.ZodString>;
        agentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        query: string;
        agentId?: string | undefined;
        limit?: string | undefined;
    }, {
        query: string;
        agentId?: string | undefined;
        limit?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        query: string;
        agentId?: string | undefined;
        limit?: string | undefined;
    };
    path?: undefined;
    body?: undefined;
}, {
    query: {
        query: string;
        agentId?: string | undefined;
        limit?: string | undefined;
    };
    path?: undefined;
    body?: undefined;
}>;
export declare const zGetApiTransactionsHistoryData: z.ZodObject<{
    body: z.ZodOptional<z.ZodNever>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodObject<{
        limit: z.ZodOptional<z.ZodString>;
        chain: z.ZodOptional<z.ZodString>;
        agentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        agentId?: string | undefined;
        chain?: string | undefined;
        limit?: string | undefined;
    }, {
        agentId?: string | undefined;
        chain?: string | undefined;
        limit?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    path?: undefined;
    query?: {
        agentId?: string | undefined;
        chain?: string | undefined;
        limit?: string | undefined;
    } | undefined;
    body?: undefined;
}, {
    path?: undefined;
    query?: {
        agentId?: string | undefined;
        chain?: string | undefined;
        limit?: string | undefined;
    } | undefined;
    body?: undefined;
}>;
export declare const zPostApiFundingRequestsData: z.ZodObject<{
    body: z.ZodObject<{
        amount: z.ZodString;
        reason: z.ZodOptional<z.ZodString>;
        chain: z.ZodOptional<z.ZodString>;
        currency: z.ZodOptional<z.ZodString>;
        agentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        amount: string;
        agentId?: string | undefined;
        chain?: string | undefined;
        currency?: string | undefined;
        reason?: string | undefined;
    }, {
        amount: string;
        agentId?: string | undefined;
        chain?: string | undefined;
        currency?: string | undefined;
        reason?: string | undefined;
    }>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodNever>;
}, "strip", z.ZodTypeAny, {
    body: {
        amount: string;
        agentId?: string | undefined;
        chain?: string | undefined;
        currency?: string | undefined;
        reason?: string | undefined;
    };
    path?: undefined;
    query?: undefined;
}, {
    body: {
        amount: string;
        agentId?: string | undefined;
        chain?: string | undefined;
        currency?: string | undefined;
        reason?: string | undefined;
    };
    path?: undefined;
    query?: undefined;
}>;
export declare const zPostApiOnrampCryptoData: z.ZodObject<{
    body: z.ZodObject<{
        wallet_address: z.ZodString;
        provider: z.ZodOptional<z.ZodEnum<["auto", "stripe", "coinbase"]>>;
        chain: z.ZodOptional<z.ZodEnum<["base", "solana", "polygon"]>>;
        fiat_amount: z.ZodOptional<z.ZodString>;
        fiat_currency: z.ZodOptional<z.ZodString>;
        lock_wallet_address: z.ZodOptional<z.ZodBoolean>;
        redirect_url: z.ZodOptional<z.ZodString>;
        agentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        wallet_address: string;
        agentId?: string | undefined;
        chain?: "base" | "solana" | "polygon" | undefined;
        provider?: "auto" | "stripe" | "coinbase" | undefined;
        fiat_amount?: string | undefined;
        fiat_currency?: string | undefined;
        lock_wallet_address?: boolean | undefined;
        redirect_url?: string | undefined;
    }, {
        wallet_address: string;
        agentId?: string | undefined;
        chain?: "base" | "solana" | "polygon" | undefined;
        provider?: "auto" | "stripe" | "coinbase" | undefined;
        fiat_amount?: string | undefined;
        fiat_currency?: string | undefined;
        lock_wallet_address?: boolean | undefined;
        redirect_url?: string | undefined;
    }>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodNever>;
}, "strip", z.ZodTypeAny, {
    body: {
        wallet_address: string;
        agentId?: string | undefined;
        chain?: "base" | "solana" | "polygon" | undefined;
        provider?: "auto" | "stripe" | "coinbase" | undefined;
        fiat_amount?: string | undefined;
        fiat_currency?: string | undefined;
        lock_wallet_address?: boolean | undefined;
        redirect_url?: string | undefined;
    };
    path?: undefined;
    query?: undefined;
}, {
    body: {
        wallet_address: string;
        agentId?: string | undefined;
        chain?: "base" | "solana" | "polygon" | undefined;
        provider?: "auto" | "stripe" | "coinbase" | undefined;
        fiat_amount?: string | undefined;
        fiat_currency?: string | undefined;
        lock_wallet_address?: boolean | undefined;
        redirect_url?: string | undefined;
    };
    path?: undefined;
    query?: undefined;
}>;
export declare const zPostApiSignupBonusClaimData: z.ZodObject<{
    body: z.ZodObject<{
        agentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        agentId?: string | undefined;
    }, {
        agentId?: string | undefined;
    }>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodNever>;
}, "strip", z.ZodTypeAny, {
    body: {
        agentId?: string | undefined;
    };
    path?: undefined;
    query?: undefined;
}, {
    body: {
        agentId?: string | undefined;
    };
    path?: undefined;
    query?: undefined;
}>;
export declare const zPostApiX402PaymentsData: z.ZodObject<{
    body: z.ZodObject<{
        chain: z.ZodString;
        to: z.ZodString;
        amount: z.ZodString;
        token: z.ZodOptional<z.ZodString>;
        decimals: z.ZodOptional<z.ZodNumber>;
        valid_for_seconds: z.ZodOptional<z.ZodNumber>;
        resource_url: z.ZodOptional<z.ZodString>;
        resource_description: z.ZodOptional<z.ZodString>;
        fee_payer: z.ZodOptional<z.ZodString>;
        http_method: z.ZodOptional<z.ZodEnum<["GET", "POST"]>>;
        agentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        chain: string;
        to: string;
        amount: string;
        agentId?: string | undefined;
        decimals?: number | undefined;
        token?: string | undefined;
        valid_for_seconds?: number | undefined;
        resource_url?: string | undefined;
        resource_description?: string | undefined;
        fee_payer?: string | undefined;
        http_method?: "POST" | "GET" | undefined;
    }, {
        chain: string;
        to: string;
        amount: string;
        agentId?: string | undefined;
        decimals?: number | undefined;
        token?: string | undefined;
        valid_for_seconds?: number | undefined;
        resource_url?: string | undefined;
        resource_description?: string | undefined;
        fee_payer?: string | undefined;
        http_method?: "POST" | "GET" | undefined;
    }>;
    path: z.ZodOptional<z.ZodNever>;
    query: z.ZodOptional<z.ZodNever>;
}, "strip", z.ZodTypeAny, {
    body: {
        chain: string;
        to: string;
        amount: string;
        agentId?: string | undefined;
        decimals?: number | undefined;
        token?: string | undefined;
        valid_for_seconds?: number | undefined;
        resource_url?: string | undefined;
        resource_description?: string | undefined;
        fee_payer?: string | undefined;
        http_method?: "POST" | "GET" | undefined;
    };
    path?: undefined;
    query?: undefined;
}, {
    body: {
        chain: string;
        to: string;
        amount: string;
        agentId?: string | undefined;
        decimals?: number | undefined;
        token?: string | undefined;
        valid_for_seconds?: number | undefined;
        resource_url?: string | undefined;
        resource_description?: string | undefined;
        fee_payer?: string | undefined;
        http_method?: "POST" | "GET" | undefined;
    };
    path?: undefined;
    query?: undefined;
}>;
//# sourceMappingURL=zod.gen.d.ts.map