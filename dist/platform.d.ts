import { SpongeWallet } from "./client.js";
import { type Agent, type BankCreateExternalAccountOptions, type BankCreateKycLinkOptions, type BankCreateTransferOptions, type BankCustomer, type BankExternalAccount, type BankKycLinkResponse, type BankTransfer, type BankVirtualAccount, type BridgeCreateExternalAccountOptions, type BridgeCreateKycLinkOptions, type BridgeCreateTransferOptions, type BridgeCustomer, type BridgeExternalAccount, type BridgeKycLinkResponse, type BridgeTransfer, type BridgeVirtualAccount, type CreatedMasterApiKey, type MasterApiKey, type PlatformConnectOptions, type PlatformCreateAgentOptions, type PlatformFleetSpendingLimitOptions, type PlatformFleetSpendingLimitResult } from "./types/schemas.js";
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
    getBankCustomer(_forceRefresh?: boolean, agentId?: string): Promise<BankCustomer | null>;
    getBridgeCustomer(forceRefresh?: boolean, agentId?: string): Promise<BridgeCustomer | null>;
    createBankKycLink(options?: BankCreateKycLinkOptions): Promise<BankKycLinkResponse>;
    createBridgeKycLink(options?: BridgeCreateKycLinkOptions): Promise<BridgeKycLinkResponse>;
    listBankExternalAccounts(agentId?: string): Promise<BankExternalAccount[]>;
    listBridgeExternalAccounts(agentId?: string): Promise<BridgeExternalAccount[]>;
    createBankExternalAccount(options: BankCreateExternalAccountOptions): Promise<BankExternalAccount>;
    createBridgeExternalAccount(options: BridgeCreateExternalAccountOptions): Promise<BridgeExternalAccount>;
    getBankVirtualAccount(walletId: string, agentId?: string): Promise<BankVirtualAccount | null>;
    getBridgeVirtualAccount(walletId: string, agentId?: string): Promise<BridgeVirtualAccount | null>;
    createBankVirtualAccount(walletId: string, agentId?: string): Promise<BankVirtualAccount>;
    createBridgeVirtualAccount(walletId: string, agentId?: string): Promise<BridgeVirtualAccount>;
    listBankTransfers(transferId?: string, agentId?: string): Promise<BankTransfer[]>;
    listBridgeTransfers(transferId?: string, agentId?: string): Promise<BridgeTransfer[]>;
    createBankTransfer(options: BankCreateTransferOptions): Promise<BankTransfer>;
    createBridgeTransfer(options: BridgeCreateTransferOptions): Promise<BridgeTransfer>;
    connectAgent(options: {
        apiKey: string;
        agentId?: string;
    }): Promise<SpongeWallet>;
    getBaseUrl(): string;
}
//# sourceMappingURL=platform.d.ts.map