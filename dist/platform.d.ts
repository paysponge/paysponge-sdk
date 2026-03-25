import { SpongeWallet } from "./client.js";
import { type Agent, type CreatedMasterApiKey, type MasterApiKey, type PlatformConnectOptions, type PlatformCreateAgentOptions } from "./types/schemas.js";
export declare class SpongePlatform {
    private readonly http;
    private readonly agents;
    private readonly baseUrl;
    private constructor();
    static connect(options?: PlatformConnectOptions): Promise<SpongePlatform>;
    createAgent(options: PlatformCreateAgentOptions): Promise<{
        agent: Agent;
        apiKey: string;
    }>;
    listAgents(): Promise<Agent[]>;
    getAgent(agentId: string): Promise<Agent>;
    updateAgent(agentId: string, updates: Partial<PlatformCreateAgentOptions>): Promise<Agent>;
    deleteAgent(agentId: string): Promise<void>;
    getAgentApiKey(agentId: string, isTestMode?: boolean): Promise<string | null>;
    regenerateAgentApiKey(agentId: string, isTestMode?: boolean): Promise<string>;
    listMasterKeys(): Promise<MasterApiKey[]>;
    createMasterKey(name?: string): Promise<CreatedMasterApiKey>;
    revokeMasterKey(id: string): Promise<void>;
    connectAgent(options: {
        apiKey: string;
        agentId?: string;
    }): Promise<SpongeWallet>;
    getBaseUrl(): string;
}
//# sourceMappingURL=platform.d.ts.map