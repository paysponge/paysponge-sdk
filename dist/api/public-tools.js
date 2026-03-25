import { DetailedBalancesSchema, EvmTransferOptionsSchema, SolanaTransferOptionsSchema, SubmitTransactionSchema, SolanaTokensResponseSchema, SolanaTokenSearchResponseSchema, OnrampCryptoOptionsSchema, OnrampCryptoResponseSchema, SignupBonusClaimResponseSchema, TransactionHistoryDetailedSchema, SpongeResponseSchema, X402PaymentResponseSchema, } from "../types/schemas.js";
import { createGeneratedApiClient } from "./generated/openapi-adapter.js";
export class PublicToolsApi {
    http;
    constructor(http) {
        this.http = http;
    }
    async getDetailedBalances(options = {}) {
        const client = createGeneratedApiClient(this.http);
        const params = {};
        if (options.chain) {
            params.chain = options.chain;
        }
        if (options.allowedChains?.length) {
            params.allowedChains = options.allowedChains.join(",");
        }
        if (options.onlyUsdc) {
            params.onlyUsdc = "true";
        }
        const response = await client.request(client.api.getApiBalancesRequestOpts(params));
        return DetailedBalancesSchema.parse(response);
    }
    async evmTransfer(options) {
        const client = createGeneratedApiClient(this.http);
        const validated = EvmTransferOptionsSchema.parse(options);
        const response = await client.request(client.api.postApiTransfersEvmRequestOpts({
            postApiTransfersEvmRequest: validated,
        }));
        return SubmitTransactionSchema.parse(response);
    }
    async solanaTransfer(options) {
        const client = createGeneratedApiClient(this.http);
        const validated = SolanaTransferOptionsSchema.parse(options);
        const response = await client.request(client.api.postApiTransfersSolanaRequestOpts({
            postApiTransfersSolanaRequest: validated,
        }));
        return SubmitTransactionSchema.parse(response);
    }
    async getSolanaTokens(chain) {
        const client = createGeneratedApiClient(this.http);
        const response = await client.request(client.api.getApiSolanaTokensRequestOpts({ chain }));
        return SolanaTokensResponseSchema.parse(response);
    }
    async searchSolanaTokens(query, limit) {
        const client = createGeneratedApiClient(this.http);
        const params = { query };
        if (limit !== undefined)
            params.limit = limit.toString();
        const response = await client.request(client.api.getApiSolanaTokensSearchRequestOpts(params));
        return SolanaTokenSearchResponseSchema.parse(response);
    }
    async getTransactionHistoryDetailed(options = {}) {
        const client = createGeneratedApiClient(this.http);
        const params = {};
        if (options.limit !== undefined)
            params.limit = options.limit.toString();
        if (options.chain)
            params.chain = options.chain;
        const response = await client.request(client.api.getApiTransactionsHistoryRequestOpts(params));
        return TransactionHistoryDetailedSchema.parse(response);
    }
    async createOnrampLink(options) {
        const client = createGeneratedApiClient(this.http);
        const validated = OnrampCryptoOptionsSchema.parse(options);
        const response = await client.request(client.api.postApiOnrampCryptoRequestOpts({
            postApiOnrampCryptoRequest: validated,
        }));
        return OnrampCryptoResponseSchema.parse(response);
    }
    async claimSignupBonus() {
        const client = createGeneratedApiClient(this.http);
        const response = await client.request(client.api.postApiSignupBonusClaimRequestOpts({
            postApiSignupBonusClaimRequest: {},
        }));
        return SignupBonusClaimResponseSchema.parse(response);
    }
    async sponge(request) {
        const response = await this.http.post("/api/sponge", request);
        return SpongeResponseSchema.parse(response);
    }
    async createX402Payment(options) {
        const client = createGeneratedApiClient(this.http);
        const response = await client.request(client.api.postApiX402PaymentsRequestOpts({
            postApiX402PaymentsRequest: options,
        }));
        return X402PaymentResponseSchema.parse(response);
    }
    async paidFetch(options) {
        const { method = "GET", ...rest } = options;
        return this.http.post("/api/paid/fetch", {
            ...rest,
            method,
        });
    }
    async x402Fetch(options) {
        const { preferredChain, preferred_chain, method = "GET", ...rest } = options;
        return this.http.post("/api/x402/fetch", {
            ...rest,
            method,
            preferred_chain: preferred_chain ?? preferredChain,
        });
    }
}
//# sourceMappingURL=public-tools.js.map