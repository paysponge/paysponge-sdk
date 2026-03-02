import { z } from "zod";
import {
  WalletSchema,
  ChainSchema,
  CHAIN_IDS,
  type Wallet,
  type Chain,
  type Balance,
} from "../types/schemas.js";
import type { HttpClient } from "./http.js";
import {
  getApiWallets,
  getApiWalletsById,
  getApiWalletsByIdBalance,
} from "./generated/heyapi/sdk.gen.js";
import { getHeyApiClient } from "./generated/heyapi-adapter.js";

// Balance response from API
const BalanceResponseSchema = z.object({
  walletId: z.string(),
  address: z.string(),
  chainId: z.number(),
  balance: z.string(),
  balanceFormatted: z.string(),
  symbol: z.string(),
  tokenBalances: z
    .array(
      z.object({
        tokenAddress: z.string(),
        symbol: z.string(),
        name: z.string(),
        decimals: z.number(),
        balance: z.string(),
        formatted: z.string(),
        usdValue: z.string().optional(),
      })
    )
    .optional(),
});

export class WalletsApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all wallets for an agent
   */
  async list(
    agentId: string,
    options?: { includeBalances?: boolean }
  ): Promise<Wallet[]> {
    const params: Record<string, string> = {
      agentId,
    };
    if (options?.includeBalances) {
      params.includeBalances = "true";
    }

    const response = await getApiWallets({
      client: getHeyApiClient(this.http),
      query: params,
    });
    return z.array(WalletSchema).parse(response);
  }

  /**
   * Get a specific wallet by ID
   */
  async get(walletId: string): Promise<Wallet> {
    const response = await getApiWalletsById({
      client: getHeyApiClient(this.http),
      path: { id: walletId },
    });
    return WalletSchema.parse(response);
  }

  /**
   * Get wallet balance
   */
  async getBalance(walletId: string, chainId?: number): Promise<Balance> {
    const params: Record<string, string> = {};
    if (chainId !== undefined) {
      params.chainId = chainId.toString();
    }

    const response = await getApiWalletsByIdBalance({
      client: getHeyApiClient(this.http),
      path: { id: walletId },
      query: params,
    });
    const parsed = BalanceResponseSchema.parse(response);

    // Convert to simple balance map
    const balance: Balance = {
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
  async getAllBalances(agentId: string): Promise<Record<Chain, Balance>> {
    const wallets = await this.list(agentId, { includeBalances: true });

    const balances: Partial<Record<Chain, Balance>> = {};

    for (const wallet of wallets) {
      // Find chain name from chainId
      const chainEntry = Object.entries(CHAIN_IDS).find(
        ([_, id]) => id === wallet.chainId
      );
      if (!chainEntry) continue;

      const chainName = chainEntry[0] as Chain;
      const chainResult = ChainSchema.safeParse(chainName);
      if (!chainResult.success) continue;

      const balance: Balance = {};

      if (wallet.symbol && wallet.balance) {
        balance[wallet.symbol] = wallet.balance;
      }

      balances[chainResult.data] = balance;
    }

    return balances as Record<Chain, Balance>;
  }

  /**
   * Get wallet address for a specific chain
   */
  async getAddress(agentId: string, chain: Chain): Promise<string | null> {
    const chainId = CHAIN_IDS[chain];
    const wallets = await this.list(agentId);

    const wallet = wallets.find((w) => w.chainId === chainId);
    return wallet?.address ?? null;
  }

  /**
   * Get all wallet addresses for an agent
   */
  async getAllAddresses(agentId: string): Promise<Record<Chain, string>> {
    const wallets = await this.list(agentId);

    const addresses: Partial<Record<Chain, string>> = {};

    for (const wallet of wallets) {
      const chainEntry = Object.entries(CHAIN_IDS).find(
        ([_, id]) => id === wallet.chainId
      );
      if (!chainEntry) continue;

      const chainName = chainEntry[0] as Chain;
      const chainResult = ChainSchema.safeParse(chainName);
      if (!chainResult.success) continue;

      addresses[chainResult.data] = wallet.address;
    }

    return addresses as Record<Chain, string>;
  }
}
