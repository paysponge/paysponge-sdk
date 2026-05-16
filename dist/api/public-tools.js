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
    async mppFetch(options) {
        const { method = "GET", ...rest } = options;
        return this.http.post("/api/mpp/fetch", {
            ...rest,
            method,
        });
    }
    async discoverServices(options = {}) {
        return this.http.get("/api/discover", {
            type: options.type,
            limit: options.limit?.toString(),
            offset: options.offset?.toString(),
            query: options.query,
            category: options.category,
        });
    }
    async getService(serviceId) {
        return this.http.get(`/api/discover/${encodeURIComponent(serviceId)}`);
    }
    async polymarket(options) {
        return this.http.post("/api/polymarket", options);
    }
    async storeCreditCard(options) {
        return this.http.post("/api/credit-cards", options);
    }
    async getStoredCreditCard(options = {}) {
        return this.http.get("/api/credit-cards", {
            agentId: options.agentId,
        });
    }
    async addLinkPaymentMethod(agentId, options = {}) {
        return this.http.post(`/api/agents/${encodeURIComponent(agentId)}/link-payment-methods/link`, {
            linkPaymentMethodId: options.linkPaymentMethodId ?? options.link_payment_method_id,
            setAsDefault: options.setAsDefault ?? options.set_as_default,
            clientName: options.clientName ?? options.client_name,
            email: options.email,
            phone: options.phone,
            billing: options.billing,
            shipping: options.shipping,
        });
    }
    async createLinkPaymentCredential(agentId, options = {}) {
        return this.http.post(`/api/agents/${encodeURIComponent(agentId)}/link-payment-methods/credential`, {
            linkPaymentMethodId: options.linkPaymentMethodId ?? options.link_payment_method_id,
            spendRequestId: options.spendRequestId ?? options.spend_request_id,
            amount: options.amount,
            currency: options.currency,
            merchantName: options.merchantName ?? options.merchant_name,
            merchantUrl: options.merchantUrl ?? options.merchant_url,
            context: options.context,
        });
    }
    async getCard(options = {}) {
        return this.http.post("/api/cards", options);
    }
    async issueVirtualCard(options) {
        return this.http.post("/api/virtual-cards", options);
    }
    async reportCardUsage(options) {
        return this.http.post("/api/card-usage", options);
    }
    async getSpongeCardStatus(options = {}) {
        return this.http.get("/api/sponge-card/status", {
            agentId: options.agentId,
            refresh: options.refresh === undefined ? undefined : String(Boolean(options.refresh)),
        });
    }
    async onboardSpongeCard(options = {}) {
        return this.http.post("/api/sponge-card/onboard", options);
    }
    async acceptSpongeCardTerms(options) {
        return this.http.post("/api/sponge-card/terms", options);
    }
    async createSpongeCard(options) {
        return this.http.post("/api/sponge-card/create-card", options);
    }
    async getSpongeCardDetails(options = {}) {
        return this.http.get("/api/sponge-card/details", {
            agentId: options.agentId,
        });
    }
    async fundSpongeCard(options) {
        return this.http.post("/api/sponge-card/fund", options);
    }
    async withdrawSpongeCard(options) {
        return this.http.post("/api/sponge-card/withdraw", options);
    }
}
//# sourceMappingURL=public-tools.js.map