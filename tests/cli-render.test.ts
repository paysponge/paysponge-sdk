import { beforeEach, describe, expect, it, vi } from "vitest";

const logSuccess = vi.fn();
const logInfo = vi.fn();
const logWarn = vi.fn();
const note = vi.fn();

vi.mock("@clack/prompts", () => ({
  log: {
    success: logSuccess,
    info: logInfo,
    warn: logWarn,
    error: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
  },
  note,
}));

import { displayToolResult } from "../src/cli.js";
import { TOOL_DEFINITIONS } from "../src/tools/definitions.js";

describe("CLI renderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders table output for get_key_list", () => {
    const tool = TOOL_DEFINITIONS.find((entry) => entry.name === "get_key_list");
    expect(tool).toBeDefined();

    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    displayToolResult(tool!, {
      keys: [
        {
          service: "openai",
          label: "primary",
          key_preview: "sk-te...1234",
          created_at: "2026-03-23T00:00:00.000Z",
        },
      ],
    });

    expect(logSuccess).toHaveBeenCalledWith("Stored keys");
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("Service"));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("openai"));

    consoleLog.mockRestore();
  });

  it("renders link output for create_crypto_onramp", () => {
    const tool = TOOL_DEFINITIONS.find(
      (entry) => entry.name === "create_crypto_onramp",
    );
    expect(tool).toBeDefined();

    displayToolResult(tool!, {
      url: "https://buy.example.com/session/123",
      provider: "stripe",
      status: "initiated",
      destinationChain: "base",
    });

    expect(logSuccess).toHaveBeenCalledWith("Onramp session");
    expect(logInfo).toHaveBeenCalledWith(
      "Link: https://buy.example.com/session/123",
    );
    expect(logInfo).toHaveBeenCalledWith(
      expect.stringContaining("Provider: stripe"),
    );
  });

  it("renders http response output for x402_fetch", () => {
    const tool = TOOL_DEFINITIONS.find((entry) => entry.name === "x402_fetch");
    expect(tool).toBeDefined();

    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    displayToolResult(tool!, {
      status: 200,
      ok: true,
      payment_made: true,
      payment_details: {
        amount: "0.01",
        token: "USDC",
        chain: "base",
        to: "0xabc",
      },
      data: { ok: true, result: "paid" },
    });

    expect(logSuccess).toHaveBeenCalledWith("x402 fetch: 200");
    expect(logInfo).toHaveBeenCalledWith(
      expect.stringContaining("Payment made: yes"),
    );
    expect(consoleLog).toHaveBeenCalledWith(
      JSON.stringify({ ok: true, result: "paid" }, null, 2),
    );

    consoleLog.mockRestore();
  });
});
