import { type Wallet, type Chain, type Balance } from "../types/schemas.js";
import type { HttpClient } from "./http.js";
export declare class WalletsApi {
    private readonly http;
    constructor(http: HttpClient);
    /**
     * List all wallets for an agent
     */
    list(agentId: string, options?: {
        includeBalances?: boolean;
    }): Promise<Wallet[]>;
    /**
     * Get a specific wallet by ID
     */
    get(walletId: string): Promise<Wallet>;
    /**
     * Get wallet balance
     */
    getBalance(walletId: string, chainId?: number): Promise<Balance>;
    /**
     * Get balances for all wallets of an agent
     */
    getAllBalances(agentId: string, options?: {
        includeTestnets?: boolean;
    }): Promise<Record<Chain, Balance>>;
    /**
     * Get wallet address for a specific chain
     */
    getAddress(agentId: string, chain: Chain): Promise<string | null>;
    /**
     * Get all wallet addresses for an agent
     */
    getAllAddresses(agentId: string, options?: {
        includeTestnets?: boolean;
    }): Promise<Record<Chain, string>>;
}
//# sourceMappingURL=wallets.d.ts.map