import { describe, expect, it, vi } from "vitest";
import { SpongePlatform } from "../src/platform.js";

describe("SpongePlatform", () => {
  it("creates and lists agents using a master key", async () => {
    const get = vi.fn().mockResolvedValue([
      {
        id: "7f24403f-9be0-40c0-90b7-b1e8b8760b10",
        name: "Agent One",
        description: null,
        status: "active",
        dailySpendingLimit: null,
        weeklySpendingLimit: null,
        monthlySpendingLimit: null,
        createdAt: "2026-03-25T00:00:00.000Z",
        updatedAt: "2026-03-25T00:00:00.000Z",
      },
    ]);
    const post = vi.fn().mockResolvedValue({
      agent: {
        id: "7f24403f-9be0-40c0-90b7-b1e8b8760b10",
        name: "Agent One",
        description: null,
        status: "active",
        dailySpendingLimit: null,
        weeklySpendingLimit: null,
        monthlySpendingLimit: null,
        createdAt: "2026-03-25T00:00:00.000Z",
        updatedAt: "2026-03-25T00:00:00.000Z",
      },
      mcpApiKey: "sponge_test_agent_123",
    });

    const platform = await SpongePlatform.connect({
      apiKey: "sponge_master_123",
    });
    (platform as any).http.get = get;
    (platform as any).http.post = post;
    (platform as any).agents = {
      list: async () => get(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const created = await platform.createAgent({
      name: "Agent One",
      isTestMode: true,
    });
    const agents = await platform.listAgents();

    expect(post).toHaveBeenCalledWith("/api/agents", {
      name: "Agent One",
      isTestMode: true,
    });
    expect(created.apiKey).toBe("sponge_test_agent_123");
    expect(agents).toHaveLength(1);
    expect(agents[0]?.name).toBe("Agent One");
  });

  it("manages master keys", async () => {
    const platform = await SpongePlatform.connect({
      apiKey: "sponge_master_123",
    });

    (platform as any).http.get = vi.fn().mockResolvedValue([
      {
        id: "b664bd0d-cf1c-4890-a2d8-e26d132e3ea4",
        keyPrefix: "sponge_master_abcd1234",
        keyName: "Platform Key",
        scopes: ["agents:create", "agents:read", "agents:delete"],
        isActive: true,
        usageCount: 2,
        lastUsedAt: "2026-03-25T00:00:00.000Z",
        expiresAt: null,
        createdAt: "2026-03-25T00:00:00.000Z",
      },
    ]);
    (platform as any).http.post = vi.fn().mockResolvedValue({
      id: "b664bd0d-cf1c-4890-a2d8-e26d132e3ea4",
      apiKey: "sponge_master_secret",
      keyName: "Platform Key",
      scopes: ["agents:create", "agents:read", "agents:delete"],
      createdAt: "2026-03-25T00:00:00.000Z",
    });
    (platform as any).http.delete = vi.fn().mockResolvedValue(undefined);

    const created = await platform.createMasterKey("Platform Key");
    const listed = await platform.listMasterKeys();
    await platform.revokeMasterKey("b664bd0d-cf1c-4890-a2d8-e26d132e3ea4");

    expect(created.apiKey).toBe("sponge_master_secret");
    expect(listed[0]?.keyPrefix).toBe("sponge_master_abcd1234");
    expect((platform as any).http.delete).toHaveBeenCalledWith(
      "/api/master-keys/b664bd0d-cf1c-4890-a2d8-e26d132e3ea4"
    );
  });
});
