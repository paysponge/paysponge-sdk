import { z } from "zod";
import { getApiKey } from "./auth/credentials.js";
import { AgentsApi } from "./api/agents.js";
import { HttpClient } from "./api/http.js";
import { SpongeWallet } from "./client.js";
import {
  AgentSchema,
  CreatedMasterApiKeySchema,
  MasterApiKeySchema,
  PlatformConnectOptionsSchema,
  PlatformCreateAgentOptionsSchema,
  type Agent,
  type CreatedMasterApiKey,
  type MasterApiKey,
  type PlatformConnectOptions,
  type PlatformCreateAgentOptions,
} from "./types/schemas.js";

const DEFAULT_BASE_URL = "https://api.wallet.paysponge.com";

const CreateAgentResponseSchema = z.object({
  agent: AgentSchema,
  mcpApiKey: z.string(),
});

const AgentApiKeyResponseSchema = z.object({
  mcpApiKey: z.string().nullable(),
});

export class SpongePlatform {
  private readonly http: HttpClient;
  private readonly agents: AgentsApi;
  private readonly baseUrl: string;

  private constructor(options: { apiKey: string; baseUrl?: string }) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.http = new HttpClient({
      apiKey: options.apiKey,
      baseUrl: this.baseUrl,
    });
    this.agents = new AgentsApi(this.http);
  }

  static async connect(options: PlatformConnectOptions = {}): Promise<SpongePlatform> {
    const validated = PlatformConnectOptionsSchema.parse(options);
    const apiKey = validated.apiKey ?? getApiKey("SPONGE_MASTER_KEY");

    if (!apiKey) {
      throw new Error(
        "Missing master API key. Pass apiKey to SpongePlatform.connect() or set SPONGE_MASTER_KEY."
      );
    }

    return new SpongePlatform({
      apiKey,
      baseUrl: validated.baseUrl,
    });
  }

  async createAgent(
    options: PlatformCreateAgentOptions
  ): Promise<{ agent: Agent; apiKey: string }> {
    const validated = PlatformCreateAgentOptionsSchema.parse(options);
    const response = await this.http.post("/api/agents", validated);
    const parsed = CreateAgentResponseSchema.parse(response);

    return {
      agent: parsed.agent,
      apiKey: parsed.mcpApiKey,
    };
  }

  async listAgents(): Promise<Agent[]> {
    return this.agents.list();
  }

  async getAgent(agentId: string): Promise<Agent> {
    return this.agents.get(agentId);
  }

  async updateAgent(
    agentId: string,
    updates: Partial<PlatformCreateAgentOptions>
  ): Promise<Agent> {
    return this.agents.update(agentId, updates);
  }

  async deleteAgent(agentId: string): Promise<void> {
    return this.agents.delete(agentId);
  }

  async getAgentApiKey(agentId: string, isTestMode = true): Promise<string | null> {
    const response = await this.http.get("/api/agents/" + encodeURIComponent(agentId) + "/api-key", {
      isTestMode: String(isTestMode),
    });
    return AgentApiKeyResponseSchema.parse(response).mcpApiKey;
  }

  async regenerateAgentApiKey(agentId: string, isTestMode = true): Promise<string> {
    const response = await this.http.post("/api/agents/" + encodeURIComponent(agentId) + "/regenerate-key", {
      isTestMode,
    });
    return z.object({ mcpApiKey: z.string() }).parse(response).mcpApiKey;
  }

  async listMasterKeys(): Promise<MasterApiKey[]> {
    const response = await this.http.get("/api/master-keys/");
    return z.array(MasterApiKeySchema).parse(response);
  }

  async createMasterKey(name?: string): Promise<CreatedMasterApiKey> {
    const response = await this.http.post("/api/master-keys/", {
      name,
    });
    return CreatedMasterApiKeySchema.parse(response);
  }

  async revokeMasterKey(id: string): Promise<void> {
    await this.http.delete("/api/master-keys/" + encodeURIComponent(id));
  }

  async connectAgent(options: { apiKey: string; agentId?: string }): Promise<SpongeWallet> {
    return SpongeWallet.connect({
      apiKey: options.apiKey,
      agentId: options.agentId,
      baseUrl: this.baseUrl,
    });
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
