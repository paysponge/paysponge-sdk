import { describe, expect, it, vi } from "vitest";
import {
  getApiAgentsById,
  getApiTransactions,
} from "../src/api/generated/heyapi/sdk.gen.js";
import * as generatedSdk from "../src/api/generated/heyapi/sdk.gen.js";
import { getHeyApiClient } from "../src/api/generated/heyapi-adapter.js";

describe("Hey API adapter", () => {
  it("normalizes trailing slash routes from OpenAPI", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({ items: [] }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    await getApiTransactions({
      client: getHeyApiClient(http as any),
      query: { limit: "10" },
    });

    expect(http.get).toHaveBeenCalledWith("/api/transactions", { limit: "10" });
  });

  it("interpolates path params from templates", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    await getApiAgentsById({
      client: getHeyApiClient(http as any),
      path: { id: "agent-1" },
    });

    expect(http.get).toHaveBeenCalledWith("/api/agents/agent-1", undefined);
  });

  it("throws when required path params are missing", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    await expect(
      getApiAgentsById({
        client: getHeyApiClient(http as any),
        path: { id: undefined as unknown as string },
      })
    ).rejects.toThrow("Missing path parameter: id");
  });

  it("only exposes approved generated operations", () => {
    const exportedOperations = Object.keys(generatedSdk)
      .filter((key) => key !== "client")
      .sort();

    expect(exportedOperations).toEqual(
      [
        "deleteApiAgentsById",
        "getApiAgents",
        "getApiAgentsById",
        "getApiAgentsMe",
        "getApiBalances",
        "getApiSolanaTokens",
        "getApiSolanaTokensSearch",
        "getApiTransactions",
        "getApiTransactionsHistory",
        "getApiTransactionsStatusByTxHash",
        "getApiWallets",
        "getApiWalletsById",
        "getApiWalletsByIdBalance",
        "postApiAgents",
        "postApiFundingRequests",
        "postApiOnrampCrypto",
        "postApiSignupBonusClaim",
        "postApiTransactionsSwap",
        "postApiTransfersEvm",
        "postApiTransfersSolana",
        "postApiTransfersTempo",
        "postApiX402Payments",
        "putApiAgentsById",
      ].sort()
    );
  });
});
