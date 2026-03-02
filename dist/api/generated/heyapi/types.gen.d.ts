export type ClientOptions = {
    baseUrl: `${string}://openapi.json` | (string & {});
};
export type GetApiAgentsMeData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/api/agents/me';
};
export type GetApiAgentsData = {
    body?: never;
    path?: never;
    query?: {
        includeBalances?: string;
        testMode?: string;
    };
    url: '/api/agents/';
};
export type PostApiAgentsData = {
    body: {
        name: string;
        description?: string;
        agentType?: string;
        dailySpendingLimit?: string;
        weeklySpendingLimit?: string;
        monthlySpendingLimit?: string;
        metadata?: {
            [key: string]: unknown;
        };
        isTestMode?: boolean;
    };
    path?: never;
    query?: never;
    url: '/api/agents/';
};
export type DeleteApiAgentsByIdData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/api/agents/{id}';
};
export type GetApiAgentsByIdData = {
    body?: never;
    path: {
        id: string;
    };
    query?: {
        includeBalances?: string;
        testMode?: string;
    };
    url: '/api/agents/{id}';
};
export type PutApiAgentsByIdData = {
    body: {
        name?: string;
        description?: string;
        agentType?: string;
        status?: string;
        dailySpendingLimit?: string;
        weeklySpendingLimit?: string;
        monthlySpendingLimit?: string;
        metadata?: {
            [key: string]: unknown;
        };
    };
    path: {
        id: string;
    };
    query?: never;
    url: '/api/agents/{id}';
};
export type GetApiWalletsData = {
    body?: never;
    path?: never;
    query?: {
        agentId?: string;
        includeBalances?: string;
        testMode?: string;
    };
    url: '/api/wallets/';
};
export type GetApiWalletsByIdData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/api/wallets/{id}';
};
export type GetApiWalletsByIdBalanceData = {
    body?: never;
    path: {
        id: string;
    };
    query?: {
        chainId?: string;
    };
    url: '/api/wallets/{id}/balance';
};
export type GetApiTransactionsData = {
    body?: never;
    path?: never;
    query?: {
        agentId?: string;
        page?: string;
        perPage?: string;
        limit?: string;
        offset?: string;
        testMode?: string;
    };
    url: '/api/transactions/';
};
export type PostApiTransactionsSwapData = {
    body: {
        chain: string;
        inputToken: string;
        outputToken: string;
        amount: string;
        slippageBps?: number;
        agentId?: string;
    };
    path?: never;
    query?: never;
    url: '/api/transactions/swap';
};
export type GetApiTransactionsStatusByTxHashData = {
    body?: never;
    path: {
        txHash: string;
    };
    query: {
        chain: string;
        agentId?: string;
    };
    url: '/api/transactions/status/{txHash}';
};
export type GetApiBalancesData = {
    body?: never;
    path?: never;
    query?: {
        chain?: string;
        allowedChains?: string;
        onlyUsdc?: string;
        agentId?: string;
    };
    url: '/api/balances';
};
export type PostApiTransfersEvmData = {
    body: {
        chain: string;
        to: string;
        amount: string;
        currency: 'ETH' | 'USDC';
        agentId?: string;
    };
    path?: never;
    query?: never;
    url: '/api/transfers/evm';
};
export type PostApiTransfersSolanaData = {
    body: {
        chain: string;
        to: string;
        amount: string;
        currency: 'SOL' | 'USDC';
        agentId?: string;
    };
    path?: never;
    query?: never;
    url: '/api/transfers/solana';
};
export type PostApiTransfersTempoData = {
    body: {
        chain?: 'tempo' | 'tempo-mainnet';
        to: string;
        amount: string;
        agentId?: string;
    };
    path?: never;
    query?: never;
    url: '/api/transfers/tempo';
};
export type GetApiSolanaTokensData = {
    body?: never;
    path?: never;
    query: {
        chain: string;
        agentId?: string;
    };
    url: '/api/solana/tokens';
};
export type GetApiSolanaTokensSearchData = {
    body?: never;
    path?: never;
    query: {
        query: string;
        limit?: string;
        agentId?: string;
    };
    url: '/api/solana/tokens/search';
};
export type GetApiTransactionsHistoryData = {
    body?: never;
    path?: never;
    query?: {
        limit?: string;
        chain?: string;
        agentId?: string;
    };
    url: '/api/transactions/history';
};
export type PostApiFundingRequestsData = {
    body: {
        amount: string;
        reason?: string;
        chain?: string;
        currency?: string;
        agentId?: string;
    };
    path?: never;
    query?: never;
    url: '/api/funding-requests';
};
export type PostApiOnrampCryptoData = {
    body: {
        wallet_address: string;
        provider?: 'auto' | 'stripe' | 'coinbase';
        chain?: 'base' | 'solana' | 'polygon';
        fiat_amount?: string;
        fiat_currency?: string;
        lock_wallet_address?: boolean;
        redirect_url?: string;
        agentId?: string;
    };
    path?: never;
    query?: never;
    url: '/api/onramp/crypto';
};
export type PostApiSignupBonusClaimData = {
    body: {
        agentId?: string;
    };
    path?: never;
    query?: never;
    url: '/api/signup-bonus/claim';
};
export type PostApiX402PaymentsData = {
    body: {
        chain: string;
        to: string;
        amount: string;
        token?: string;
        decimals?: number;
        valid_for_seconds?: number;
        resource_url?: string;
        resource_description?: string;
        fee_payer?: string;
        http_method?: 'GET' | 'POST';
        agentId?: string;
    };
    path?: never;
    query?: never;
    url: '/api/x402/payments';
};
//# sourceMappingURL=types.gen.d.ts.map