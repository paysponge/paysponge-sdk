import { describe, expect, it, vi } from "vitest";
import { WalletsApi } from "../src/api/wallets.js";

const walletFixture = {
  id: "660e8400-e29b-41d4-a716-446655440000",
  agentId: "770e8400-e29b-41d4-a716-446655440000",
  chainId: 8453,
  chainName: "base",
  address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
  isActive: true,
  createdAt: new Date().toISOString(),
  symbol: "USDC",
  balance: "10.0",
};

const testnetWalletFixture = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  agentId: "770e8400-e29b-41d4-a716-446655440000",
  chainId: 102,
  chainName: "solana-devnet",
  address: "So11111111111111111111111111111111111111112",
  isActive: true,
  createdAt: new Date().toISOString(),
  symbol: "USDC",
  balance: "1.0",
};

describe("WalletsApi compatibility", () => {
  it("lists wallets from /api/wallets", async () => {
    const http = {
      get: vi.fn().mockResolvedValue([walletFixture]),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const api = new WalletsApi(http as any);

    const result = await api.list(walletFixture.agentId, { includeBalances: true });

    expect(result).toHaveLength(1);
    expect(http.get).toHaveBeenCalledWith("/api/wallets", {
      agentId: walletFixture.agentId,
      includeBalances: "true",
    });
  });

  it("gets wallet balance from /api/wallets/:id/balance", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({
        walletId: walletFixture.id,
        address: walletFixture.address,
        chainId: 8453,
        balance: "10000000",
        balanceFormatted: "10",
        symbol: "USDC",
        tokenBalances: [
          {
            tokenAddress: "0xabc",
            symbol: "ETH",
            name: "Ether",
            decimals: 18,
            balance: "10000000000000000",
            formatted: "0.01",
          },
        ],
      }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const api = new WalletsApi(http as any);

    const result = await api.getBalance(walletFixture.id, 8453);

    expect(result.USDC).toBe("10");
    expect(result.ETH).toBe("0.01");
    expect(http.get).toHaveBeenCalledWith(
      `/api/wallets/${walletFixture.id}/balance`,
      { chainId: "8453" }
    );
  });

  it("filters testnet addresses from aggregate views by default", async () => {
    const http = {
      get: vi.fn().mockResolvedValue([walletFixture, testnetWalletFixture]),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const api = new WalletsApi(http as any);

    await expect(api.getAllAddresses(walletFixture.agentId)).resolves.toEqual({
      base: walletFixture.address,
    });
  });

  it("can include testnet addresses in aggregate views", async () => {
    const http = {
      get: vi.fn().mockResolvedValue([walletFixture, testnetWalletFixture]),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const api = new WalletsApi(http as any);

    await expect(
      api.getAllAddresses(walletFixture.agentId, { includeTestnets: true })
    ).resolves.toEqual({
      base: walletFixture.address,
      "solana-devnet": testnetWalletFixture.address,
    });
  });

  it("filters testnet balances from aggregate views by default", async () => {
    const http = {
      get: vi.fn().mockResolvedValue([walletFixture, testnetWalletFixture]),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const api = new WalletsApi(http as any);

    await expect(api.getAllBalances(walletFixture.agentId)).resolves.toEqual({
      base: { USDC: "10.0" },
    });
  });
});
