import {
  DetailedBalancesSchema,
  EvmTransferOptionsSchema,
  SolanaTransferOptionsSchema,
  SubmitTransactionSchema,
  SolanaTokensResponseSchema,
  SolanaTokenSearchResponseSchema,
  OnrampCryptoOptionsSchema,
  OnrampCryptoResponseSchema,
  SignupBonusClaimResponseSchema,
  TransactionHistoryDetailedSchema,
  SpongeResponseSchema,
  X402PaymentResponseSchema,
  type Chain,
  type EvmTransferOptions,
  type SolanaTransferOptions,
  type SubmitTransaction,
  type DetailedBalances,
  type SolanaTokensResponse,
  type SolanaTokenSearchResponse,
  type OnrampCryptoOptions,
  type OnrampCryptoResponse,
  type SignupBonusClaimResponse,
  type TransactionHistoryDetailed,
  type SpongeResponse,
  type X402PaymentResponse,
  type SolanaChain,
} from "../types/schemas.js";
import type { HttpClient } from "./http.js";
import { createGeneratedApiClient } from "./generated/openapi-adapter.js";

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
  action:
    | "enable"
    | "signup"
    | "status"
    | "order"
    | "positions"
    | "orders"
    | "balance_allowance"
    | "refresh_balance_allowance"
    | "get_order"
    | "cancel"
    | "search_markets"
    | "get_market"
    | "get_market_price"
    | "set_allowances"
    | "deposit"
    | "deposit_from_wallet"
    | "withdraw"
    | "withdraw_native"
    | "redeem";
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

export class PublicToolsApi {
  constructor(private readonly http: HttpClient) {}

  async getDetailedBalances(options: DetailedBalanceOptions = {}): Promise<DetailedBalances> {
    const client = createGeneratedApiClient(this.http);
    const params: Record<string, string> = {};
    if (options.chain) {
      params.chain = options.chain;
    }
    if (options.allowedChains?.length) {
      params.allowedChains = options.allowedChains.join(",");
    }
    if (options.onlyUsdc) {
      params.onlyUsdc = "true";
    }

    const response = await client.request(
      client.api.getApiBalancesRequestOpts(params),
    );
    return DetailedBalancesSchema.parse(response);
  }

  async evmTransfer(options: EvmTransferOptions): Promise<SubmitTransaction> {
    const client = createGeneratedApiClient(this.http);
    const validated = EvmTransferOptionsSchema.parse(options);
    const response = await client.request(
      client.api.postApiTransfersEvmRequestOpts({
        postApiTransfersEvmRequest: validated,
      }),
    );
    return SubmitTransactionSchema.parse(response);
  }

  async solanaTransfer(options: SolanaTransferOptions): Promise<SubmitTransaction> {
    const client = createGeneratedApiClient(this.http);
    const validated = SolanaTransferOptionsSchema.parse(options);
    const response = await client.request(
      client.api.postApiTransfersSolanaRequestOpts({
        postApiTransfersSolanaRequest: validated,
      }),
    );
    return SubmitTransactionSchema.parse(response);
  }

  async getSolanaTokens(chain: SolanaChain): Promise<SolanaTokensResponse> {
    const client = createGeneratedApiClient(this.http);
    const response = await client.request(
      client.api.getApiSolanaTokensRequestOpts({ chain }),
    );
    return SolanaTokensResponseSchema.parse(response);
  }

  async searchSolanaTokens(query: string, limit?: number): Promise<SolanaTokenSearchResponse> {
    const client = createGeneratedApiClient(this.http);
    const params: { query: string; limit?: string } = { query };
    if (limit !== undefined) params.limit = limit.toString();
    const response = await client.request(
      client.api.getApiSolanaTokensSearchRequestOpts(params),
    );
    return SolanaTokenSearchResponseSchema.parse(response);
  }

  async getTransactionHistoryDetailed(
    options: TransactionHistoryDetailedOptions = {},
  ): Promise<TransactionHistoryDetailed> {
    const client = createGeneratedApiClient(this.http);
    const params: Record<string, string> = {};
    if (options.limit !== undefined) params.limit = options.limit.toString();
    if (options.chain) params.chain = options.chain;
    const response = await client.request(
      client.api.getApiTransactionsHistoryRequestOpts(params),
    );
    return TransactionHistoryDetailedSchema.parse(response);
  }

  async createOnrampLink(options: OnrampCryptoOptions): Promise<OnrampCryptoResponse> {
    const client = createGeneratedApiClient(this.http);
    const validated = OnrampCryptoOptionsSchema.parse(options);
    const response = await client.request(
      client.api.postApiOnrampCryptoRequestOpts({
        postApiOnrampCryptoRequest: validated,
      }),
    );
    return OnrampCryptoResponseSchema.parse(response);
  }

  async claimSignupBonus(): Promise<SignupBonusClaimResponse> {
    const client = createGeneratedApiClient(this.http);
    const response = await client.request(
      client.api.postApiSignupBonusClaimRequestOpts({
        postApiSignupBonusClaimRequest: {},
      }),
    );
    return SignupBonusClaimResponseSchema.parse(response);
  }

  async sponge(request: SpongeRequest): Promise<SpongeResponse> {
    const response = await this.http.post<unknown>("/api/sponge", request);
    return SpongeResponseSchema.parse(response);
  }

  async createX402Payment(options: CreateX402PaymentOptions): Promise<X402PaymentResponse> {
    const client = createGeneratedApiClient(this.http);
    const response = await client.request(
      client.api.postApiX402PaymentsRequestOpts({
        postApiX402PaymentsRequest: options,
      }),
    );
    return X402PaymentResponseSchema.parse(response);
  }

  async paidFetch(options: PaidFetchOptions): Promise<unknown> {
    const { method = "GET", ...rest } = options;

    return this.http.post<unknown>("/api/paid/fetch", {
      ...rest,
      method,
    });
  }

  async x402Fetch(options: X402FetchOptions): Promise<unknown> {
    const {
      preferredChain,
      preferred_chain,
      method = "GET",
      ...rest
    } = options;

    return this.http.post<unknown>("/api/x402/fetch", {
      ...rest,
      method,
      preferred_chain: preferred_chain ?? preferredChain,
    });
  }

  async mppFetch(options: MppFetchOptions): Promise<unknown> {
    const { method = "GET", ...rest } = options;

    return this.http.post<unknown>("/api/mpp/fetch", {
      ...rest,
      method,
    });
  }

  async discoverServices(options: DiscoverServicesOptions = {}): Promise<unknown> {
    return this.http.get<unknown>("/api/discover", {
      type: options.type,
      limit: options.limit?.toString(),
      offset: options.offset?.toString(),
      query: options.query,
      category: options.category,
    });
  }

  async getService(serviceId: string): Promise<unknown> {
    return this.http.get<unknown>(`/api/discover/${encodeURIComponent(serviceId)}`);
  }

  async polymarket(options: PolymarketOptions): Promise<unknown> {
    return this.http.post<unknown>("/api/polymarket", options);
  }
}
