import type { Client, Options as Options2, TDataShape } from './client/index.js';
import type { DeleteApiAgentsByIdData, GetApiAgentsByIdData, GetApiAgentsData, GetApiAgentsMeData, GetApiBalancesData, GetApiSolanaTokensData, GetApiSolanaTokensSearchData, GetApiTransactionsData, GetApiTransactionsHistoryData, GetApiTransactionsStatusByTxHashData, GetApiWalletsByIdBalanceData, GetApiWalletsByIdData, GetApiWalletsData, PostApiAgentsData, PostApiFundingRequestsData, PostApiOnrampCryptoData, PostApiSignupBonusClaimData, PostApiTransactionsSwapData, PostApiTransfersEvmData, PostApiTransfersSolanaData, PostApiTransfersTempoData, PostApiX402PaymentsData, PutApiAgentsByIdData } from './types.gen.js';
export type Options<TData extends TDataShape = TDataShape, ThrowOnError extends boolean = boolean> = Options2<TData, ThrowOnError> & {
    /**
     * You can provide a client instance returned by `createClient()` instead of
     * individual options. This might be also useful if you want to implement a
     * custom client.
     */
    client?: Client;
    /**
     * You can pass arbitrary values through the `meta` object. This can be
     * used to access values that aren't defined as part of the SDK function.
     */
    meta?: Record<string, unknown>;
};
export declare const getApiAgentsMe: <ThrowOnError extends boolean = false>(options?: Options<GetApiAgentsMeData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const getApiAgents: <ThrowOnError extends boolean = false>(options?: Options<GetApiAgentsData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const postApiAgents: <ThrowOnError extends boolean = false>(options: Options<PostApiAgentsData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const deleteApiAgentsById: <ThrowOnError extends boolean = false>(options: Options<DeleteApiAgentsByIdData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const getApiAgentsById: <ThrowOnError extends boolean = false>(options: Options<GetApiAgentsByIdData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const putApiAgentsById: <ThrowOnError extends boolean = false>(options: Options<PutApiAgentsByIdData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const getApiWallets: <ThrowOnError extends boolean = false>(options?: Options<GetApiWalletsData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const getApiWalletsById: <ThrowOnError extends boolean = false>(options: Options<GetApiWalletsByIdData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const getApiWalletsByIdBalance: <ThrowOnError extends boolean = false>(options: Options<GetApiWalletsByIdBalanceData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const getApiTransactions: <ThrowOnError extends boolean = false>(options?: Options<GetApiTransactionsData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const postApiTransactionsSwap: <ThrowOnError extends boolean = false>(options: Options<PostApiTransactionsSwapData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const getApiTransactionsStatusByTxHash: <ThrowOnError extends boolean = false>(options: Options<GetApiTransactionsStatusByTxHashData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const getApiBalances: <ThrowOnError extends boolean = false>(options?: Options<GetApiBalancesData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const postApiTransfersEvm: <ThrowOnError extends boolean = false>(options: Options<PostApiTransfersEvmData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const postApiTransfersSolana: <ThrowOnError extends boolean = false>(options: Options<PostApiTransfersSolanaData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const postApiTransfersTempo: <ThrowOnError extends boolean = false>(options: Options<PostApiTransfersTempoData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const getApiSolanaTokens: <ThrowOnError extends boolean = false>(options: Options<GetApiSolanaTokensData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const getApiSolanaTokensSearch: <ThrowOnError extends boolean = false>(options: Options<GetApiSolanaTokensSearchData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const getApiTransactionsHistory: <ThrowOnError extends boolean = false>(options?: Options<GetApiTransactionsHistoryData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const postApiFundingRequests: <ThrowOnError extends boolean = false>(options: Options<PostApiFundingRequestsData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const postApiOnrampCrypto: <ThrowOnError extends boolean = false>(options: Options<PostApiOnrampCryptoData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const postApiSignupBonusClaim: <ThrowOnError extends boolean = false>(options: Options<PostApiSignupBonusClaimData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
export declare const postApiX402Payments: <ThrowOnError extends boolean = false>(options: Options<PostApiX402PaymentsData, ThrowOnError>) => import("./client/types.gen.js").RequestResult<unknown, unknown, ThrowOnError, "data">;
//# sourceMappingURL=sdk.gen.d.ts.map