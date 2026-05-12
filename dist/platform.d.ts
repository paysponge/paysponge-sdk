import { SpongeWallet } from "./client.js";
import { type Agent, type BridgeCreateExternalAccountOptions, type BridgeCreateKycLinkOptions, type BridgeCreateTransferOptions, type BridgeCustomer, type BridgeExternalAccount, type BridgeKycLinkResponse, type BridgeTransfer, type BridgeVirtualAccount, type CreatedMasterApiKey, type MasterApiKey, type PlatformConnectOptions, type PlatformCreateAgentOptions, type PlatformFleetSpendingLimitOptions, type PlatformFleetSpendingLimitResult } from "./types/schemas.js";
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
    setFleetSpendingLimits(options: PlatformFleetSpendingLimitOptions): Promise<PlatformFleetSpendingLimitResult>;
    deleteAgent(agentId: string): Promise<void>;
    getAgentApiKey(agentId: string, isTestMode?: boolean): Promise<string | null>;
    regenerateAgentApiKey(agentId: string, isTestMode?: boolean): Promise<string>;
    listMasterKeys(): Promise<MasterApiKey[]>;
    createMasterKey(name?: string): Promise<CreatedMasterApiKey>;
    revokeMasterKey(id: string): Promise<void>;
    getBridgeCustomer(_forceRefresh?: boolean, agentId?: string): Promise<BridgeCustomer | null>;
    createBridgeKycLink(options?: BridgeCreateKycLinkOptions): Promise<BridgeKycLinkResponse>;
    listBridgeExternalAccounts(agentId?: string): Promise<BridgeExternalAccount[]>;
    createBridgeExternalAccount(options: BridgeCreateExternalAccountOptions): Promise<BridgeExternalAccount>;
    getBridgeVirtualAccount(walletId: string, agentId?: string): Promise<BridgeVirtualAccount | null>;
    createBridgeVirtualAccount(walletId: string, agentId?: string): Promise<BridgeVirtualAccount>;
    listBridgeTransfers(transferId?: string, agentId?: string): Promise<BridgeTransfer[]>;
    createBridgeTransfer(options: BridgeCreateTransferOptions): Promise<BridgeTransfer>;
    connectAgent(options: {
        apiKey: string;
        agentId?: string;
    }): Promise<SpongeWallet>;
    getBaseUrl(): string;
}
//# sourceMappingURL=platform.d.ts.map