import { describe, expect, it, vi } from "vitest";
import { PublicToolsApi } from "../src/api/public-tools.js";

describe("PublicToolsApi", () => {
  it("builds balance query params", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn(),
    };
    const api = new PublicToolsApi(http as any);

    await api.getDetailedBalances({
      chain: "base",
      allowedChains: ["base", "solana"],
      onlyUsdc: true,
    });

    expect(http.get).toHaveBeenCalledWith("/api/balances", {
      chain: "base",
      allowedChains: "base,solana",
      onlyUsdc: "true",
    });
  });

  it("posts evm transfers to the REST endpoint", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        transactionHash: "0xabc",
        status: "pending",
        explorerUrl: "https://example.com/tx/0xabc",
      }),
    };
    const api = new PublicToolsApi(http as any);

    const result = await api.evmTransfer({
      chain: "base",
      to: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      amount: "1",
      currency: "USDC",
    });

    expect(result.transactionHash).toBe("0xabc");
    expect(http.post).toHaveBeenCalledWith("/api/transfers/evm", {
      chain: "base",
      to: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      amount: "1",
      currency: "USDC",
    });
  });

  it("claims signup bonus via the REST endpoint", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        success: true,
        message: "Signup bonus claimed",
        amount: "5",
        currency: "USDC",
        chain: "base",
        recipientAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
        transactionHash: "0xabc",
        explorerUrl: "https://basescan.org/tx/0xabc",
      }),
    };
    const api = new PublicToolsApi(http as any);

    const result = await api.claimSignupBonus();

    expect(result.success).toBe(true);
    expect(http.post).toHaveBeenCalledWith("/api/signup-bonus/claim", {});
  });

  it("posts x402 fetch requests to the REST endpoint", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        data: { hello: "world" },
      }),
    };
    const api = new PublicToolsApi(http as any);

    const result = await api.x402Fetch({
      url: "https://paid.example.com/data",
      method: "GET",
      preferred_chain: "base",
    });

    expect(result).toEqual({
      ok: true,
      status: 200,
      data: { hello: "world" },
    });
    expect(http.post).toHaveBeenCalledWith("/api/x402/fetch", {
      url: "https://paid.example.com/data",
      method: "GET",
      preferred_chain: "base",
    });
  });

  it("supports preferredChain and defaults method to GET", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ ok: true }),
    };
    const api = new PublicToolsApi(http as any);

    await api.x402Fetch({
      url: "https://paid.example.com/other",
      preferredChain: "solana",
    });

    expect(http.post).toHaveBeenCalledWith("/api/x402/fetch", {
      url: "https://paid.example.com/other",
      method: "GET",
      preferred_chain: "solana",
    });
  });
});
