import { DetailedBalancesSchema, EvmTransferOptionsSchema, SolanaTransferOptionsSchema, SubmitTransactionSchema, SolanaTokensResponseSchema, SolanaTokenSearchResponseSchema, OnrampCryptoOptionsSchema, OnrampCryptoResponseSchema, SignupBonusClaimResponseSchema, TransactionHistoryDetailedSchema, SpongeResponseSchema, X402PaymentResponseSchema, } from "../types/schemas.js";
import { getApiBalances, getApiSolanaTokens, getApiSolanaTokensSearch, getApiTransactionsHistory, postApiOnrampCrypto, postApiSignupBonusClaim, postApiTransfersEvm, postApiTransfersSolana, postApiX402Payments, } from "./generated/heyapi/sdk.gen.js";
import { getHeyApiClient } from "./generated/heyapi-adapter.js";
export class PublicToolsApi {
    http;
    constructor(http) {
        this.http = http;
    }
    async getDetailedBalances(options = {}) {
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
        const response = await getApiBalances({
            client: getHeyApiClient(this.http),
            query: params,
        });
        return DetailedBalancesSchema.parse(response);
    }
    async evmTransfer(options) {
        const validated = EvmTransferOptionsSchema.parse(options);
        const response = await postApiTransfersEvm({
            client: getHeyApiClient(this.http),
            body: validated,
        });
        return SubmitTransactionSchema.parse(response);
    }
    async solanaTransfer(options) {
        const validated = SolanaTransferOptionsSchema.parse(options);
        const response = await postApiTransfersSolana({
            client: getHeyApiClient(this.http),
            body: validated,
        });
        return SubmitTransactionSchema.parse(response);
    }
    async getSolanaTokens(chain) {
        const response = await getApiSolanaTokens({
            client: getHeyApiClient(this.http),
            query: { chain },
        });
        return SolanaTokensResponseSchema.parse(response);
    }
    async searchSolanaTokens(query, limit) {
        const params = { query };
        if (limit !== undefined)
            params.limit = limit.toString();
        const response = await getApiSolanaTokensSearch({
            client: getHeyApiClient(this.http),
            query: params,
        });
        return SolanaTokenSearchResponseSchema.parse(response);
    }
    async getTransactionHistoryDetailed(options = {}) {
        const params = {};
        if (options.limit !== undefined)
            params.limit = options.limit.toString();
        if (options.chain)
            params.chain = options.chain;
        const response = await getApiTransactionsHistory({
            client: getHeyApiClient(this.http),
            query: params,
        });
        return TransactionHistoryDetailedSchema.parse(response);
    }
    async createOnrampLink(options) {
        const validated = OnrampCryptoOptionsSchema.parse(options);
        const response = await postApiOnrampCrypto({
            client: getHeyApiClient(this.http),
            body: validated,
        });
        return OnrampCryptoResponseSchema.parse(response);
    }
    async claimSignupBonus() {
        const response = await postApiSignupBonusClaim({
            client: getHeyApiClient(this.http),
            body: {},
        });
        return SignupBonusClaimResponseSchema.parse(response);
    }
    async sponge(request) {
        const response = await this.http.post("/api/sponge", request);
        return SpongeResponseSchema.parse(response);
    }
    async createX402Payment(options) {
        const response = await postApiX402Payments({
            client: getHeyApiClient(this.http),
            body: options,
        });
        return X402PaymentResponseSchema.parse(response);
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