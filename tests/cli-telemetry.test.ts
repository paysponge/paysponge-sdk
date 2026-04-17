import { beforeEach, describe, expect, it, vi } from "vitest";

const captureCliCommandEvent = vi.fn(async () => {});
const shutdownCliTelemetry = vi.fn(async () => {});

vi.mock("@clack/prompts", () => ({
  log: {
    success: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
  },
  note: vi.fn(),
  intro: vi.fn(),
  outro: vi.fn(),
}));

vi.mock("../src/telemetry.js", () => ({
  captureCliCommandEvent,
  captureCliAuthEvent: vi.fn(async () => {}),
  classifyBaseUrl: (baseUrl?: string) => {
    if (!baseUrl || baseUrl === "https://api.wallet.paysponge.com") {
      return "default";
    }
    return baseUrl.includes("localhost") ? "localhost" : "custom";
  },
  sanitizeErrorForTelemetry: (error: unknown) => {
    if (!(error instanceof Error)) {
      return {};
    }
    return { error_name: error.name };
  },
  shutdownCliTelemetry,
}));

import { runCli } from "../src/cli.js";

describe("CLI telemetry hooks", () => {
  beforeEach(() => {
    captureCliCommandEvent.mockClear();
    shutdownCliTelemetry.mockClear();
    delete process.env.SPONGE_API_KEY;
  });

  it("records a successful command execution", async () => {
    await runCli(["logout"], {
      commandName: "spongewallet",
      packageName: "@paysponge/sdk",
      version: "0.1.39",
    });

    expect(captureCliCommandEvent).toHaveBeenCalledWith(expect.objectContaining({
      status: "succeeded",
      command_name: "logout",
      command_path: "logout",
      command_group: "logout",
      raw_arg_count: 1,
      flags: [],
      auth_source: "interactive_or_public",
      package_name: "@paysponge/sdk",
      package_version: "0.1.39",
      command_name_override: "spongewallet",
    }), undefined);
    expect(shutdownCliTelemetry).toHaveBeenCalledTimes(1);
  });
});
