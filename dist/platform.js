import { z } from "zod";
import { getApiKey } from "./auth/credentials.js";
import { AgentsApi } from "./api/agents.js";
import { HttpClient } from "./api/http.js";
import { SpongeWallet } from "./client.js";
import { AgentSchema, CreatedMasterApiKeySchema, MasterApiKeySchema, PlatformConnectOptionsSchema, PlatformCreateAgentOptionsSchema, } from "./types/schemas.js";
const DEFAULT_BASE_URL = "https://api.wallet.paysponge.com";
const CreateAgentResponseSchema = z.object({
    agent: AgentSchema,
    mcpApiKey: z.string(),
});
const AgentApiKeyResponseSchema = z.object({
    mcpApiKey: z.string().nullable(),
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