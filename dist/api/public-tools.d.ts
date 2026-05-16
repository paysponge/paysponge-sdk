import { type Chain, type EvmTransferOptions, type SolanaTransferOptions, type SubmitTransaction, type DetailedBalances, type SolanaTokensResponse, type SolanaTokenSearchResponse, type OnrampCryptoOptions, type OnrampCryptoResponse, type SignupBonusClaimResponse, type TransactionHistoryDetailed, type SpongeResponse, type X402PaymentResponse, type SolanaChain } from "../types/schemas.js";
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
export interface PaidFetchOptions {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    body?: unknown;
    chain?: "base" | "solana" | "tempo" | "ethereum";
    protocol?: "x402" | "mpp";
}
export interface MppFetchOptions {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    body?: unknown;
    chain?: "tempo" | "tempo-testnet";
}
export interface DiscoverServicesOptions {
    type?: string;
    limit?: number;
    offset?: number;
    query?: string;
    category?: string;
}
export interface PolymarketOptions {
    action: "enable" | "signup" | "status" | "order" | "positions" | "orders" | "balance_allowance" | "refresh_balance_allowance" | "get_order" | "cancel" | "search_markets" | "get_market" | "get_market_price" | "set_allowances" | "deposit" | "deposit_from_wallet" | "withdraw" | "withdraw_native" | "redeem";
    market_slug?: string;
    token_id?: string;
    outcome?: "yes" | "no";
    side?: "buy" | "sell";
    size?: number;
    type?: "limit" | "market";
    price?: number;
    order_type?: "GTC" | "GTD" | "FOK" | "FAK";
    order_id?: string;
    query?: string;
    limit?: number;
    amount?: string;
    condition_id?: string;
}
export interface StoreCreditCardOptions {
    card_number: string;
    expiry_month?: string;
    expiry_year?: string;
    expiration?: string;
    cvc: string;
    cardholder_name: string;
    email: string;
    billing_address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
    };
    shipping_address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
        phone: string;
    };
    label?: string;
    metadata?: Record<string, unknown>;
}
export interface GetCardOptions {
    card_type?: "rain" | "basis_theory_vaulted";
    payment_method_id?: string;
    amount?: string;
    currency?: string;
    merchant_name?: string;
    merchant_url?: string;
}
export interface IssueVirtualCardOptions {
    amount: string;
    currency?: string;
    merchant_name: string;
    merchant_url: string;
    merchant_country_code?: string;
    description?: string;
    products?: Array<{
        name: string;
        price: number;
        quantity: number;
    }>;
    shipping_address?: {
        line1: string;
        city: string;
        state: string;
        postal_code: string;
        country_code: string;
    };
    enrollment_id?: string;
}
export interface ReportCardUsageOptions {
    payment_method_id: string;
    merchant_name?: string;
    merchant_domain?: string;
    amount?: string;
    currency?: string;
    status: "success" | "failed" | "cancelled";
    failure_reason?: string;
}
export interface LinkPaymentAddress {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}
export interface AddLinkPaymentMethodOptions {
    link_payment_method_id?: string;
    linkPaymentMethodId?: string;
    set_as_default?: boolean;
    setAsDefault?: boolean;
    client_name?: string;
    clientName?: string;
    email?: string;
    phone?: string;
    billing?: LinkPaymentAddress;
    shipping?: LinkPaymentAddress;
}
export interface CreateLinkPaymentCredentialOptions {
    link_payment_method_id?: string;
    linkPaymentMethodId?: string;
    spend_request_id?: string;
    spendRequestId?: string;
    amount?: string;
    currency?: string;
    merchant_name?: string;
    merchantName?: string;
    merchant_url?: string;
    merchantUrl?: string;
    context?: string;
}
export interface SpongeCardStatusOptions {
    refresh?: boolean;
    agentId?: string;
}
export interface SpongeCardOnboardOptions {
    occupation?: string;
    redirect_uri?: string;
    e_sign_consent?: boolean;
    account_opening_privacy_notice?: boolean;
    sponge_card_terms?: boolean;
    information_certification?: boolean;
    unauthorized_solicitation_acknowledgement?: boolean;
    agentId?: string;
}
export interface SpongeCardTermsOptions {
    e_sign_consent: boolean;
    account_opening_privacy_notice?: boolean;
    sponge_card_terms: boolean;
    information_certification: boolean;
    unauthorized_solicitation_acknowledgement: boolean;
    agentId?: string;
}
export interface SpongeCardAddress {
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postal_code: string;
    country_code: string;
}
export interface SpongeCardShippingAddress extends SpongeCardAddress {
    first_name?: string;
    last_name?: string;
}
export interface CreateSpongeCardOptions {
    billing: SpongeCardAddress;
    email: string;
    phone: string;
    shipping?: SpongeCardShippingAddress;
    agentId?: string;
}
export interface SpongeCardAmountOptions {
    amount: string;
    chain?: string;
    agentId?: string;
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
    createOnrampLink(options: OnrampCryptoOptions): Promise<OnrampCryptoResponse>;
    claimSignupBonus(): Promise<SignupBonusClaimResponse>;
    sponge(request: SpongeRequest): Promise<SpongeResponse>;
    createX402Payment(options: CreateX402PaymentOptions): Promise<X402PaymentResponse>;
    paidFetch(options: PaidFetchOptions): Promise<unknown>;
    x402Fetch(options: X402FetchOptions): Promise<unknown>;
    mppFetch(options: MppFetchOptions): Promise<unknown>;
    discoverServices(options?: DiscoverServicesOptions): Promise<unknown>;
    getService(serviceId: string): Promise<unknown>;
    polymarket(options: PolymarketOptions): Promise<unknown>;
    storeCreditCard(options: StoreCreditCardOptions): Promise<unknown>;
    getStoredCreditCard(options?: {
        agentId?: string;
    }): Promise<unknown>;
    addLinkPaymentMethod(agentId: string, options?: AddLinkPaymentMethodOptions): Promise<unknown>;
    createLinkPaymentCredential(agentId: string, options?: CreateLinkPaymentCredentialOptions): Promise<unknown>;
    getCard(options?: GetCardOptions): Promise<unknown>;
    issueVirtualCard(options: IssueVirtualCardOptions): Promise<unknown>;
    reportCardUsage(options: ReportCardUsageOptions): Promise<unknown>;
    getSpongeCardStatus(options?: SpongeCardStatusOptions): Promise<unknown>;
    onboardSpongeCard(options?: SpongeCardOnboardOptions): Promise<unknown>;
    acceptSpongeCardTerms(options: SpongeCardTermsOptions): Promise<unknown>;
    createSpongeCard(options: CreateSpongeCardOptions): Promise<unknown>;
    getSpongeCardDetails(options?: {
        agentId?: string;
    }): Promise<unknown>;
    fundSpongeCard(options: SpongeCardAmountOptions): Promise<unknown>;
    withdrawSpongeCard(options: SpongeCardAmountOptions): Promise<unknown>;
}
//# sourceMappingURL=public-tools.d.ts.map