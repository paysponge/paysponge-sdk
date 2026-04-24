import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const captureCliAuthEvent = vi.fn(async () => {});

vi.mock("clipboardy", () => ({
  default: {
    write: vi.fn(async () => {}),
  },
}));

vi.mock("../src/telemetry.js", () => ({
  captureCliAuthEvent,
  classifyBaseUrl: () => "default",
  sanitizeErrorForTelemetry: () => ({}),
}));

import { deviceFlowAuth } from "../src/auth/device-flow.js";

describe("deviceFlowAuth", () => {
  let tempDir: string;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "spongewallet-device-flow-"));
    captureCliAuthEvent.mockClear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("requests the MCP meta-scope during device authorization", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deviceCode: "device-code",
          userCode: "ABCD-1234",
          verificationUri: "https://wallet.paysponge.com/device",
          expiresIn: 60,
          interval: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: "sponge_test_123",
          tokenType: "Bearer",
          agentId: "11111111-1111-4111-8111-111111111111",
          apiKey: "sponge_test_123",
          keyType: "agent",
        }),
      });

    globalThis.fetch = fetchMock as typeof fetch;

    await deviceFlowAuth({
      noBrowser: true,
      credentialsPath: join(tempDir, "credentials.json"),
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.wallet.paysponge.com/api/oauth/device/authorization",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          clientId: "spongewallet-sdk",
          scope: "mcp:tools",
          testnet: undefined,
          agentName: undefined,
          keyType: undefined,
          email: undefined,
        }),
      }),
    );
  });
});
