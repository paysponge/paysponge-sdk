import { describe, expect, it, vi } from "vitest";
import { ToolExecutor } from "../src/tools/executor.js";
import { TOOL_DEFINITIONS } from "../src/tools/definitions.js";

describe("ToolExecutor", () => {
  it("returns Anthropic-safe tool definitions without CLI metadata", () => {
    const http = {
      get: vi.fn(),
      post: vi.fn(),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    expect(executor.definitions.length).toBeGreaterThan(0);
    expect(executor.definitions[0]).not.toHaveProperty("cli_output");
    expect(executor.definitions[0]).toHaveProperty("name");
    expect(executor.definitions[0]).toHaveProperty("description");
    expect(executor.definitions[0]).toHaveProperty("input_schema");
  });

  it("routes get_balance to /api/balances", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn(),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("get_balance", {
      chain: "base",
      allowedChains: ["base", "solana"],
      onlyUsdc: true,
    });

    expect(result.status).toBe("success");
    expect(http.get).toHaveBeenCalledWith("/api/balances", {
      chain: "base",
      allowedChains: "base,solana",
      onlyUsdc: "true",
    });
  });

  it("returns error when transaction status lacks chain", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn(),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("get_transaction_status", {
      txHash: "0xabc",
    });

    expect(result.status).toBe("error");
  });

  it("routes claim_signup_bonus to /api/signup-bonus/claim", async () => {
    const claimEnabled = TOOL_DEFINITIONS.some(
      (tool) => tool.name === "claim_signup_bonus"
    );
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ success: true }),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("claim_signup_bonus", {});

    if (!claimEnabled) {
      expect(result.status).toBe("error");
      expect(http.post).not.toHaveBeenCalled();
      return;
    }

    expect(result.status).toBe("success");
    expect(http.post).toHaveBeenCalledWith("/api/signup-bonus/claim", {});
  });

  it("routes x402_fetch to /api/x402/fetch", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ ok: true }),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("x402_fetch", {
      url: "https://paid.example.com/data",
      method: "GET",
      preferred_chain: "base",
    });

    expect(result.status).toBe("success");
    expect(http.post).toHaveBeenCalledWith("/api/x402/fetch", {
      url: "https://paid.example.com/data",
      method: "GET",
      headers: undefined,
      body: undefined,
      preferred_chain: "base",
    });
  });

  it("routes paid_fetch to /api/paid/fetch", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ ok: true }),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("paid_fetch", {
      url: "https://paid.example.com/data",
      method: "POST",
      body: { query: "hello" },
      chain: "tempo",
    });

    expect(result.status).toBe("success");
    expect(http.post).toHaveBeenCalledWith("/api/paid/fetch", {
      url: "https://paid.example.com/data",
      method: "POST",
      headers: undefined,
      body: { query: "hello" },
      chain: "tempo",
      protocol: undefined,
    });
  });

  it("routes discover_services to /api/discover", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({ services: [] }),
      post: vi.fn(),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("discover_services", {
      query: "web search",
      category: "search",
      limit: 5,
    });

    expect(result.status).toBe("success");
    expect(http.get).toHaveBeenCalledWith("/api/discover", {
      type: undefined,
      limit: "5",
      offset: undefined,
      query: "web search",
      category: "search",
    });
  });

  it("routes get_service to /api/discover/:serviceId", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({ id: "ctg_123" }),
      post: vi.fn(),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("get_service", {
      service_id: "ctg_123",
    });

    expect(result.status).toBe("success");
    expect(http.get).toHaveBeenCalledWith("/api/discover/ctg_123");
  });

  it("routes polymarket to /api/polymarket", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ ok: true }),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("polymarket", {
      action: "search_markets",
      query: "Sixers Celtics",
      limit: 5,
    });

    expect(result.status).toBe("success");
    expect(http.post).toHaveBeenCalledWith("/api/polymarket", {
      action: "search_markets",
      query: "Sixers Celtics",
      limit: 5,
    });
  });

  it("routes store_key to /api/agent-keys", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ success: true }),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("store_key", {
      service: "openai",
      key: "sk-test-123",
      label: "primary",
    });

    expect(result.status).toBe("success");
    expect(http.post).toHaveBeenCalledWith("/api/agent-keys", {
      service: "openai",
      key: "sk-test-123",
      label: "primary",
      metadata: undefined,
    });
  });

  it("routes store_credit_card to /api/credit-cards", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ success: true }),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("store_credit_card", {
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
      label: "personal",
    });

    expect(result.status).toBe("success");
    expect(http.post).toHaveBeenCalledWith("/api/credit-cards", {
      card_number: "4111111111111111",
      expiry_month: undefined,
      expiry_year: undefined,
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
      label: "personal",
      metadata: undefined,
    });
  });

  it("routes bank tools to /api/bank endpoints", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({ ok: true }),
      post: vi.fn().mockResolvedValue({ ok: true }),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    await executor.execute("bank_onboard", {
      wallet_id: "wallet_123",
      redirect_uri: "https://app.example/callback",
      customer_type: "individual",
    });
    await executor.execute("bank_status", {});
    await executor.execute("bank_create_virtual_account", {
      wallet_id: "wallet_123",
    });
    await executor.execute("bank_get_virtual_account", {
      wallet_id: "wallet_123",
    });
    await executor.execute("bank_list_external_accounts", {});
    await executor.execute("bank_add_external_account", {
      bank_name: "Chase",
      account_owner_name: "Jane Doe",
      routing_number: "021000021",
      account_number: "123456789",
      checking_or_savings: "checking",
      street_line_1: "123 Main St",
      city: "San Francisco",
      state: "CA",
      postal_code: "94105",
    });
    await executor.execute("bank_send", {
      wallet_id: "wallet_123",
      external_account_id: "external_123",
      amount: "100.00",
      payment_rail: "ach",
    });
    await executor.execute("bank_list_transfers", {
      transfer_id: "transfer_123",
    });

    expect(http.post).toHaveBeenNthCalledWith(1, "/api/bank/onboard", {
      wallet_id: "wallet_123",
      redirect_uri: "https://app.example/callback",
      customer_type: "individual",
    });
    expect(http.get).toHaveBeenNthCalledWith(1, "/api/bank/status", {});
    expect(http.post).toHaveBeenNthCalledWith(2, "/api/bank/virtual-account", {
      wallet_id: "wallet_123",
    });
    expect(http.get).toHaveBeenNthCalledWith(2, "/api/bank/virtual-account", {
      wallet_id: "wallet_123",
    });
    expect(http.get).toHaveBeenNthCalledWith(3, "/api/bank/external-accounts", {});
    expect(http.post).toHaveBeenNthCalledWith(3, "/api/bank/external-accounts", {
      bank_name: "Chase",
      account_owner_name: "Jane Doe",
      routing_number: "021000021",
      account_number: "123456789",
      checking_or_savings: "checking",
      street_line_1: "123 Main St",
      street_line_2: undefined,
      city: "San Francisco",
      state: "CA",
      postal_code: "94105",
    });
    expect(http.post).toHaveBeenNthCalledWith(4, "/api/bank/send", {
      wallet_id: "wallet_123",
      external_account_id: "external_123",
      amount: "100.00",
      payment_rail: "ach",
    });
    expect(http.get).toHaveBeenNthCalledWith(4, "/api/bank/transfers", {
      transfer_id: "transfer_123",
    });
  });

  it("routes add_link_payment_method to agent Link endpoint", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ status: "saved" }),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("add_link_payment_method", {
      link_payment_method_id: "pm_123",
      set_as_default: true,
      email: "jane@example.com",
      phone: "+14155550123",
      shipping: {
        name: "Jane Doe",
        line1: "123 Main St",
        city: "San Francisco",
        state: "CA",
        postalCode: "94105",
        country: "US",
      },
    });

    expect(result.status).toBe("success");
    expect(http.post).toHaveBeenCalledWith("/api/agents/agent-1/link-payment-methods/link", {
      linkPaymentMethodId: "pm_123",
      setAsDefault: true,
      clientName: undefined,
      email: "jane@example.com",
      phone: "+14155550123",
      billing: undefined,
      shipping: {
        name: "Jane Doe",
        line1: "123 Main St",
        city: "San Francisco",
        state: "CA",
        postalCode: "94105",
        country: "US",
      },
    });
  });

  it("routes create_link_payment_credential to agent Link credential endpoint", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ status: "credential_created" }),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("create_link_payment_credential", {
      link_payment_method_id: "link_pm_123",
      amount: "49.99",
      currency: "USD",
      merchant_name: "Netflix",
      merchant_url: "https://www.netflix.com",
      context: "Monthly subscription",
    });

    expect(result.status).toBe("success");
    expect(http.post).toHaveBeenCalledWith(
      "/api/agents/agent-1/link-payment-methods/credential",
      {
        linkPaymentMethodId: "link_pm_123",
        amount: "49.99",
        currency: "USD",
        merchantName: "Netflix",
        merchantUrl: "https://www.netflix.com",
        context: "Monthly subscription",
      },
    );
  });

  it("routes create_link_payment_credential retrieval to agent Link credential endpoint", async () => {
    const http = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ status: "credential_created" }),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("create_link_payment_credential", {
      link_payment_method_id: "saved-link-pm-123",
      spend_request_id: "sr_123",
    });

    expect(result.status).toBe("success");
    expect(http.post).toHaveBeenCalledWith(
      "/api/agents/agent-1/link-payment-methods/credential",
      {
        linkPaymentMethodId: "saved-link-pm-123",
        spendRequestId: "sr_123",
        amount: undefined,
        currency: undefined,
        merchantName: undefined,
        merchantUrl: undefined,
        context: undefined,
      },
    );
  });

  it("routes get_key_value to /api/agent-keys/value", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({ key: { service: "openai", key: "sk" } }),
      post: vi.fn(),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("get_key_value", {
      service: "openai",
    });

    expect(result.status).toBe("success");
    expect(http.get).toHaveBeenCalledWith("/api/agent-keys/value", {
      service: "openai",
    });
  });

  it("routes get_key_list to /api/agent-keys", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({ keys: [] }),
      post: vi.fn(),
    };
    const executor = new ToolExecutor(http as any, "agent-1");

    const result = await executor.execute("get_key_list", {});

    expect(result.status).toBe("success");
    expect(http.get).toHaveBeenCalledWith("/api/agent-keys", {});
  });
});
