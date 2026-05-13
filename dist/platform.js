import { z } from "zod";
import { getApiKey } from "./auth/credentials.js";
import { AgentsApi } from "./api/agents.js";
import { HttpClient } from "./api/http.js";
import { SpongeWallet } from "./client.js";
import { AgentSchema, BridgeCreateExternalAccountOptionsSchema, BridgeCreateKycLinkOptionsSchema, BridgeCreateTransferOptionsSchema, BridgeCustomerSchema, BridgeExternalAccountSchema, BridgeKycLinkResponseSchema, BridgeTransferSchema, BridgeVirtualAccountSchema, CreatedMasterApiKeySchema, MasterApiKeySchema, PlatformConnectOptionsSchema, PlatformCreateAgentOptionsSchema, PlatformFleetSpendingLimitOptionsSchema, } from "./types/schemas.js";
const DEFAULT_BASE_URL = "https://api.wallet.paysponge.com";
const CreateAgentResponseSchema = z.object({
    agent: AgentSchema,
    mcpApiKey: z.string(),
});
const AgentApiKeyResponseSchema = z.object({
    mcpApiKey: z.string().nullable(),
});
const BankStatusResponseSchema = z.object({
    onboarded: z.boolean().optional(),
    customer: BridgeCustomerSchema.optional(),
});
const BankOnboardResponseSchema = z.object({
    kyc_url: z.string().nullable(),
    customer: BridgeCustomerSchema.nullable().optional(),
});
const BankExternalAccountsResponseSchema = z.object({
    accounts: z.array(BridgeExternalAccountSchema),
});
const BankExternalAccountResponseSchema = z.object({
    account: BridgeExternalAccountSchema,
});
const BankVirtualAccountResponseSchema = z.object({
    found: z.boolean().optional(),
    virtual_account: BridgeVirtualAccountSchema.optional(),
});
const BankTransfersResponseSchema = z.object({
    transfers: z.array(BridgeTransferSchema),
});
const BankTransferResponseSchema = z.object({
    transfer: BridgeTransferSchema,
});
export class SpongePlatform {
    http;
    agents;
    baseUrl;
    constructor(options) {
        this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
        this.http = new HttpClient({
            apiKey: options.apiKey,
            baseUrl: this.baseUrl,
        });
        this.agents = new AgentsApi(this.http);
    }
    static async connect(options = {}) {
        const validated = PlatformConnectOptionsSchema.parse(options);
        const apiKey = validated.apiKey ?? getApiKey("SPONGE_MASTER_KEY");
        if (!apiKey) {
            throw new Error("Missing master API key. Pass apiKey to SpongePlatform.connect() or set SPONGE_MASTER_KEY.");
        }
        return new SpongePlatform({
            apiKey,
            baseUrl: validated.baseUrl,
        });
    }
    async createAgent(options) {
        const validated = PlatformCreateAgentOptionsSchema.parse(options);
        const response = await this.http.post("/api/agents", validated);
        const parsed = CreateAgentResponseSchema.parse(response);
        return {
            agent: parsed.agent,
            apiKey: parsed.mcpApiKey,
        };
    }
    async listAgents() {
        return this.agents.list();
    }
    async getAgent(agentId) {
        return this.agents.get(agentId);
    }
    async updateAgent(agentId, updates) {
        return this.agents.update(agentId, updates);
    }
    async setFleetSpendingLimits(options) {
        const validated = PlatformFleetSpendingLimitOptionsSchema.parse(options);
        const targetAgentIds = validated.agentIds
            ?? (await this.listAgents()).map((agent) => agent.id);
        const updates = {
            dailySpendingLimit: validated.dailySpendingLimit,
            weeklySpendingLimit: validated.weeklySpendingLimit,
            monthlySpendingLimit: validated.monthlySpendingLimit,
        };
        const settled = await Promise.all(targetAgentIds.map(async (agentId) => {
            try {
                const agent = await this.updateAgent(agentId, updates);
                return { ok: true, agent };
            }
            catch (error) {
                return {
                    ok: false,
                    agentId,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        }));
        return {
            updated: settled
                .filter((result) => result.ok)
                .map((result) => result.agent),
            failed: settled
                .filter((result) => !result.ok)
                .map((result) => ({
                agentId: result.agentId,
                error: result.error,
            })),
        };
    }
    async deleteAgent(agentId) {
        return this.agents.delete(agentId);
    }
    async getAgentApiKey(agentId, isTestMode = true) {
        const response = await this.http.get("/api/agents/" + encodeURIComponent(agentId) + "/api-key", {
            isTestMode: String(isTestMode),
        });
        return AgentApiKeyResponseSchema.parse(response).mcpApiKey;
    }
    async regenerateAgentApiKey(agentId, isTestMode = true) {
        const response = await this.http.post("/api/agents/" + encodeURIComponent(agentId) + "/regenerate-key", {
            isTestMode,
        });
        return z.object({ mcpApiKey: z.string() }).parse(response).mcpApiKey;
    }
    async listMasterKeys() {
        const response = await this.http.get("/api/master-keys/");
        return z.array(MasterApiKeySchema).parse(response);
    }
    async createMasterKey(name) {
        const response = await this.http.post("/api/master-keys/", {
            name,
        });
        return CreatedMasterApiKeySchema.parse(response);
    }
    async revokeMasterKey(id) {
        await this.http.delete("/api/master-keys/" + encodeURIComponent(id));
    }
    async getBridgeCustomer(_forceRefresh = false, agentId) {
        const response = await this.http.get("/api/bank/status", {
            agentId,
        });
        const parsed = BankStatusResponseSchema.parse(response);
        if (!parsed.customer) {
            return null;
        }
        return parsed.customer;
    }
    async createBridgeKycLink(options = {}) {
        const validated = BridgeCreateKycLinkOptionsSchema.parse(options);
        const response = await this.http.post("/api/bank/onboard", {
            wallet_id: validated.walletId,
            redirect_uri: validated.redirectUri,
            customer_type: validated.customerType,
            signed_agreement_id: validated.signedAgreementId,
            agentId: validated.agentId,
        });
        const parsed = BankOnboardResponseSchema.parse(response);
        return BridgeKycLinkResponseSchema.parse({
            url: parsed.kyc_url ?? "",
            customer: parsed.customer ?? null,
        });
    }
    async listBridgeExternalAccounts(agentId) {
        const response = await this.http.get("/api/bank/external-accounts", {
            agentId,
        });
        return BankExternalAccountsResponseSchema.parse(response).accounts;
    }
    async createBridgeExternalAccount(options) {
        const validated = BridgeCreateExternalAccountOptionsSchema.parse(options);
        const response = await this.http.post("/api/bank/external-accounts", {
            bank_name: validated.bankName,
            account_owner_name: validated.accountOwnerName,
            routing_number: validated.routingNumber,
            account_number: validated.accountNumber,
            checking_or_savings: validated.checkingOrSavings,
            street_line_1: validated.streetLine1,
            street_line_2: validated.streetLine2,
            city: validated.city,
            state: validated.state,
            postal_code: validated.postalCode,
            agentId: validated.agentId,
        });
        return BankExternalAccountResponseSchema.parse(response).account;
    }
    async getBridgeVirtualAccount(walletId, agentId) {
        const response = await this.http.get("/api/bank/virtual-account", {
            wallet_id: walletId,
            agentId,
        });
        return BankVirtualAccountResponseSchema.parse(response).virtual_account ?? null;
    }
    async createBridgeVirtualAccount(walletId, agentId) {
        const response = await this.http.post("/api/bank/virtual-account", {
            wallet_id: walletId,
            agentId,
        });
        const account = BankVirtualAccountResponseSchema.parse(response).virtual_account;
        if (!account) {
            throw new Error("Bank virtual account response did not include virtual_account");
        }
        return account;
    }
    async listBridgeTransfers(transferId, agentId) {
        const response = await this.http.get("/api/bank/transfers", {
            transfer_id: transferId,
            agentId,
        });
        return BankTransfersResponseSchema.parse(response).transfers;
    }
    async createBridgeTransfer(options) {
        const validated = BridgeCreateTransferOptionsSchema.parse(options);
        const response = await this.http.post("/api/bank/send", {
            wallet_id: validated.walletId,
            external_account_id: validated.externalAccountId,
            amount: validated.amount,
            payment_rail: validated.destinationPaymentRail,
            agentId: validated.agentId,
        });
        return BankTransferResponseSchema.parse(response).transfer;
    }
    async connectAgent(options) {
        return SpongeWallet.connect({
            apiKey: options.apiKey,
            agentId: options.agentId,
            baseUrl: this.baseUrl,
        });
    }
    getBaseUrl() {
        return this.baseUrl;
    }
}
//# sourceMappingURL=platform.js.map