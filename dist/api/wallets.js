import { z } from "zod";
import { WalletSchema, ChainSchema, CHAIN_IDS, } from "../types/schemas.js";
import { createGeneratedApiClient } from "./generated/openapi-adapter.js";
// Balance response from API
const BalanceResponseSchema = z.object({
    walletId: z.string(),
    address: z.string(),
    chainId: z.number(),
    balance: z.string(),
    balanceFormatted: z.string(),
    symbol: z.string(),
    tokenBalances: z
        .array(z.object({
        tokenAddress: z.string(),
        symbol: z.string(),
        name: z.string(),
        decimals: z.number(),
        balance: z.string(),
        formatted: z.string(),
        usdValue: z.string().optional(),
    }))
        .optional(),
});
export class WalletsApi {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * List all wallets for an agent
     */
    async list(agentId, options) {
        const client = createGeneratedApiClient(this.http);
        const params = {
            agentId,
        };
        if (options?.includeBalances) {
            params.includeBalances = "true";
        }
        const response = await client.request(client.api.getApiWalletsRequestOpts(params));
        return z.array(WalletSchema).parse(response);
    }
    /**
     * Get a specific wallet by ID
     */
    async get(walletId) {
        const client = createGeneratedApiClient(this.http);
        const response = await client.request(client.api.getApiWalletsByIdRequestOpts({ id: walletId }));
        return WalletSchema.parse(response);
    }
    /**
     * Get wallet balance
     */
    async getBalance(walletId, chainId) {
        const client = createGeneratedApiClient(this.http);
        const params = {};
        if (chainId !== undefined) {
            params.chainId = chainId.toString();
        }
        const response = await client.request(client.api.getApiWalletsByIdBalanceRequestOpts({
            id: walletId,
            ...params,
        }));
        const parsed = BalanceResponseSchema.parse(response);
        // Convert to simple balance map
        const balance = {
            [parsed.symbol]: parsed.balanceFormatted,
        };
        // Add token balances
        if (parsed.tokenBalances) {
            for (const token of parsed.tokenBalances) {
                balance[token.symbol] = token.formatted;
            }
        }
        return balance;
    }
    /**
     * Get balances for all wallets of an agent
     */
    async getAllBalances(agentId) {
        const wallets = await this.list(agentId, { includeBalances: true });
        const balances = {};
        for (const wallet of wallets) {
            // Find chain name from chainId
            const chainEntry = Object.entries(CHAIN_IDS).find(([_, id]) => id === wallet.chainId);
            if (!chainEntry)
                continue;
            const chainName = chainEntry[0];
            const chainResult = ChainSchema.safeParse(chainName);
            if (!chainResult.success)
                continue;
            const balance = {};
            if (wallet.symbol && wallet.balance) {
                balance[wallet.symbol] = wallet.balance;
            }
            balances[chainResult.data] = balance;
        }
        return balances;
    }
    /**
     * Get wallet address for a specific chain
     */
    async getAddress(agentId, chain) {
        const chainId = CHAIN_IDS[chain];
        const wallets = await this.list(agentId);
        const wallet = wallets.find((w) => w.chainId === chainId);
        return wallet?.address ?? null;
    }
    /**
     * Get all wallet addresses for an agent
     */
    async getAllAddresses(agentId) {
        const wallets = await this.list(agentId);
        const addresses = {};
        for (const wallet of wallets) {
            const chainEntry = Object.entries(CHAIN_IDS).find(([_, id]) => id === wallet.chainId);
            if (!chainEntry)
                continue;
            const chainName = chainEntry[0];
            const chainResult = ChainSchema.safeParse(chainName);
            if (!chainResult.success)
                continue;
            addresses[chainResult.data] = wallet.address;
        }
        return addresses;
    }
}
//# sourceMappingURL=wallets.js.map