import { type Chain, type EvmTransferOptions, type SolanaTransferOptions, type SubmitTransaction, type DetailedBalances, type SolanaTokensResponse, type SolanaTokenSearchResponse, type FundingRequestResponse, type OnrampCryptoOptions, type OnrampCryptoResponse, type SignupBonusClaimResponse, type TransactionHistoryDetailed, type SpongeResponse, type X402PaymentResponse, type SolanaChain } from "../types/schemas.js";
import type { HttpClient } from "./http.js";
export interface DetailedBalanceOptions {
    chain?: Chain | "all";
    allowedChains?: Chain[];
    onlyUsdc?: boolean;
}
export interface TransactionHistoryDetailedOptions {
    limit?: number;
    chain?: Chain;
}
export interface FundingRequestOptions {
    amount: string;
    reason?: string;
    chain?: Chain;
    currency?: string;
}
export interface SpongeRequest {
    [key: string]: unknown;
}
export interface CreateX402PaymentOptions {
    chain: Chain;
    to: string;
    token?: string;
    amount: string;
    decimals?: number;
    valid_for_seconds?: number;
    resource_url?: string;
    resource_description?: string;
    fee_payer?: string;
    http_method?: "GET" | "POST";
}
export interface X402FetchOptions {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    body?: unknown;
    preferredChain?: "base" | "solana" | "ethereum";
    preferred_chain?: "base" | "solana" | "ethereum";
}
export declare class PublicToolsApi {
    private readonly http;
    constructor(http: HttpClient);
    getDetailedBalances(options?: DetailedBalanceOptions): Promise<DetailedBalances>;
    evmTransfer(options: EvmTransferOptions): Promise<SubmitTransaction>;
    solanaTransfer(options: SolanaTransferOptions): Promise<SubmitTransaction>;
    getSolanaTokens(chain: SolanaChain): Promise<SolanaTokensResponse>;
    searchSolanaTokens(query: string, limit?: number): Promise<SolanaTokenSearchResponse>;
    getTransactionHistoryDetailed(options?: TransactionHistoryDetailedOptions): Promise<TransactionHistoryDetailed>;
    requestFunding(options: FundingRequestOptions): Promise<FundingRequestResponse>;
    createOnrampLink(options: OnrampCryptoOptions): Promise<OnrampCryptoResponse>;
    claimSignupBonus(): Promise<SignupBonusClaimResponse>;
    sponge(request: SpongeRequest): Promise<SpongeResponse>;
    createX402Payment(options: CreateX402PaymentOptions): Promise<X402PaymentResponse>;
    x402Fetch(options: X402FetchOptions): Promise<unknown>;
}
//# sourceMappingURL=public-tools.d.ts.map