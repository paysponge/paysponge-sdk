import { describe, expect, it, vi } from "vitest";
import {
  createGeneratedApiClient,
  getOpenApiRequestBuilder,
} from "../src/api/generated/openapi-adapter.js";
import { DefaultApi } from "../src/api/generated/openapi/index.js";

describe("OpenAPI Generator adapter", () => {
  it("normalizes trailing slash routes from the generated spec", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({ items: [] }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const client = createGeneratedApiClient(http as any);

    await client.request(
      client.api.getApiTransactionsRequestOpts({ agentId: "agent-1", limit: "10" }),
    );

    expect(http.get).toHaveBeenCalledWith("/api/transactions", {
      agentId: "agent-1",
      limit: "10",
    });
  });

  it("interpolates path params from generated request builders", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const client = createGeneratedApiClient(http as any);

    await client.request(
      client.api.getApiAgentsByIdRequestOpts({ id: "agent-1" }),
    );

    expect(http.get).toHaveBeenCalledWith("/api/agents/agent-1", undefined);
  });

  it("dispatches POST bodies from generated request builders", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ transactionHash: "0xabc" }),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const client = createGeneratedApiClient(http as any);

    await client.request(
      client.api.postApiTransfersEvmRequestOpts({
        postApiTransfersEvmRequest: {
          chain: "base",
          to: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
          amount: "1",
          currency: "USDC",
        },
      }),
    );

    expect(http.post).toHaveBeenCalledWith("/api/transfers/evm", {
      chain: "base",
      to: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      amount: "1",
      currency: "USDC",
    });
  });

  it("dispatches Tempo transfer token fields from generated request builders", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ transactionHash: "0xtempo" }),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const client = createGeneratedApiClient(http as any);

    await client.request(
      client.api.postApiTransfersTempoRequestOpts({
        postApiTransfersTempoRequest: {
          chain: "tempo",
          to: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
          amount: "1",
          token: "USDC.e",
        },
      }),
    );

    expect(http.post).toHaveBeenCalledWith("/api/transfers/tempo", {
      chain: "tempo",
      to: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      amount: "1",
      token: "USDC.e",
    });
  });

  it("exposes the full OpenAPI request builder surface", () => {
    const api = getOpenApiRequestBuilder();

    expect(api).toBeInstanceOf(DefaultApi);
    expect(typeof api.getApiAgentsRequestOpts).toBe("function");
    expect(typeof api.getApiWalletsRequestOpts).toBe("function");
    expect(typeof api.postApiTransfersEvmRequestOpts).toBe("function");
    expect(typeof api.postApiTransfersTempoRequestOpts).toBe("function");
    expect(typeof api.postApiX402PaymentsRequestOpts).toBe("function");
    expect(typeof api.postApiWalletsRequestOpts).toBe("function");
  });
});
