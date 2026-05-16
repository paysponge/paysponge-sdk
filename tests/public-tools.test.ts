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

  it("posts mpp fetch requests to the REST endpoint", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        data: { session: "mpp" },
      }),
    };
    const api = new PublicToolsApi(http as any);

    const result = await api.mppFetch({
      url: "https://tempo.example.com/premium",
      method: "POST",
      chain: "tempo",
      body: { query: "hello" },
    });

    expect(result).toEqual({
      ok: true,
      status: 200,
      data: { session: "mpp" },
    });
    expect(http.post).toHaveBeenCalledWith("/api/mpp/fetch", {
      url: "https://tempo.example.com/premium",
      method: "POST",
      chain: "tempo",
      body: { query: "hello" },
    });
  });

  it("defaults mpp fetch requests to GET", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ ok: true }),
    };
    const api = new PublicToolsApi(http as any);

    await api.mppFetch({
      url: "https://tempo.example.com/stream",
      chain: "tempo-testnet",
    });

    expect(http.post).toHaveBeenCalledWith("/api/mpp/fetch", {
      url: "https://tempo.example.com/stream",
      method: "GET",
      chain: "tempo-testnet",
    });
  });

  it("posts card helper requests to the card REST endpoints", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({ ok: true }),
      post: vi.fn().mockResolvedValue({ ok: true }),
    };
    const api = new PublicToolsApi(http as any);

    await api.storeCreditCard({
      card_number: "4111111111111111",
      expiration: "12/2030",
      cvc: "123",
      cardholder_name: "Jane Doe",
      email: "jane@example.com",
      billing_address: {
        line1: "123 Main St",
        city: "San Francisco",
        state: "CA",
        postal_code: "94105",
        country: "US",
      },
      shipping_address: {
        line1: "456 Market St",
        city: "San Francisco",
        state: "CA",
        postal_code: "94107",
        country: "US",
        phone: "+14155550123",
      },
    });
    await api.addLinkPaymentMethod("agent-1", {
      link_payment_method_id: "lpm_123",
      client_name: "Checkout",
    });
    await api.createLinkPaymentCredential("agent-1", {
      link_payment_method_id: "lpm_123",
      amount: "25",
      currency: "USD",
      merchant_name: "Example",
      merchant_url: "https://example.com",
    });
    await api.getCard({ card_type: "rain", amount: "25" });
    await api.issueVirtualCard({
      amount: "25",
      merchant_name: "Example",
      merchant_url: "https://example.com",
    });
    await api.reportCardUsage({
      payment_method_id: "pm_123",
      status: "success",
    });

    expect(http.post).toHaveBeenCalledWith("/api/credit-cards", expect.any(Object));
    expect(http.post).toHaveBeenCalledWith(
      "/api/agents/agent-1/link-payment-methods/link",
      expect.objectContaining({
        linkPaymentMethodId: "lpm_123",
        clientName: "Checkout",
      }),
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/agents/agent-1/link-payment-methods/credential",
      expect.objectContaining({
        linkPaymentMethodId: "lpm_123",
        merchantName: "Example",
        merchantUrl: "https://example.com",
      }),
    );
    expect(http.post).toHaveBeenCalledWith("/api/cards", {
      card_type: "rain",
      amount: "25",
    });
    expect(http.post).toHaveBeenCalledWith("/api/virtual-cards", {
      amount: "25",
      merchant_name: "Example",
      merchant_url: "https://example.com",
    });
    expect(http.post).toHaveBeenCalledWith("/api/card-usage", {
      payment_method_id: "pm_123",
      status: "success",
    });
  });

  it("calls Sponge Card helper endpoints", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({ ok: true }),
      post: vi.fn().mockResolvedValue({ ok: true }),
    };
    const api = new PublicToolsApi(http as any);

    await api.getSpongeCardStatus({ refresh: false });
    await api.onboardSpongeCard({ redirect_uri: "https://example.com/return" });
    await api.acceptSpongeCardTerms({
      e_sign_consent: true,
      sponge_card_terms: true,
      information_certification: true,
      unauthorized_solicitation_acknowledgement: true,
    });
    await api.createSpongeCard({
      billing: {
        line1: "123 Main St",
        city: "San Francisco",
        region: "CA",
        postal_code: "94105",
        country_code: "US",
      },
      email: "jane@example.com",
      phone: "+14155550123",
    });
    await api.getSpongeCardDetails();
    await api.fundSpongeCard({ amount: "100", chain: "base" });
    await api.withdrawSpongeCard({ amount: "50", chain: "base" });

    expect(http.get).toHaveBeenCalledWith("/api/sponge-card/status", {
      agentId: undefined,
      refresh: "false",
    });
    expect(http.post).toHaveBeenCalledWith("/api/sponge-card/onboard", {
      redirect_uri: "https://example.com/return",
    });
    expect(http.post).toHaveBeenCalledWith(
      "/api/sponge-card/terms",
      expect.objectContaining({ sponge_card_terms: true }),
    );
    expect(http.post).toHaveBeenCalledWith(
      "/api/sponge-card/create-card",
      expect.objectContaining({ email: "jane@example.com" }),
    );
    expect(http.get).toHaveBeenCalledWith("/api/sponge-card/details", {
      agentId: undefined,
    });
    expect(http.post).toHaveBeenCalledWith("/api/sponge-card/fund", {
      amount: "100",
      chain: "base",
    });
    expect(http.post).toHaveBeenCalledWith("/api/sponge-card/withdraw", {
      amount: "50",
      chain: "base",
    });
  });
});
