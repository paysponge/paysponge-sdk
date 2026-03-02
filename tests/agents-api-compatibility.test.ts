import { describe, expect, it, vi } from "vitest";
import { AgentsApi } from "../src/api/agents.js";

const agentFixture = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "bot-1",
  description: null,
  status: "active" as const,
  dailySpendingLimit: null,
  weeklySpendingLimit: null,
  monthlySpendingLimit: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("AgentsApi compatibility", () => {
  it("posts create to /api/agents", async () => {
    const http = {
      post: vi.fn().mockResolvedValue({
        agent: agentFixture,
        mcpApiKey: "sponge_test_123",
      }),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const api = new AgentsApi(http as any);

    const result = await api.create({ name: "bot-1" });

    expect(result.apiKey).toBe("sponge_test_123");
    expect(http.post).toHaveBeenCalledWith("/api/agents", { name: "bot-1" });
  });

  it("gets current agent from /api/agents/me", async () => {
    const http = {
      post: vi.fn(),
      get: vi.fn().mockResolvedValue(agentFixture),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const api = new AgentsApi(http as any);

    const result = await api.getCurrent();

    expect(result.id).toBe(agentFixture.id);
    expect(http.get).toHaveBeenCalledWith("/api/agents/me", undefined);
  });

  it("deletes agent via /api/agents/:id", async () => {
    const http = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const api = new AgentsApi(http as any);

    await api.delete("agent-123");

    expect(http.delete).toHaveBeenCalledWith("/api/agents/agent-123");
  });
});
