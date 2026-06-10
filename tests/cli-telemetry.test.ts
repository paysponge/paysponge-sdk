import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.fn();
const shutdown = vi.fn(async () => {});
const posthogConstructor = vi.fn(() => ({
  capture,
  shutdown,
}));

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

vi.mock("posthog-node", () => ({
  PostHog: posthogConstructor,
}));

import { runCli } from "../src/cli.js";

describe("CLI telemetry hooks", () => {
  let tempDir: string;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCredentialsPath = process.env.SPONGE_CREDENTIALS_PATH;

  beforeEach(() => {
    capture.mockClear();
    shutdown.mockClear();
    posthogConstructor.mockClear();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sponge-cli-telemetry-"));
    process.env.NODE_ENV = "development";
    process.env.SPONGE_CREDENTIALS_PATH = path.join(tempDir, "credentials.json");
    delete process.env.SPONGE_API_KEY;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalCredentialsPath === undefined) {
      delete process.env.SPONGE_CREDENTIALS_PATH;
    } else {
      process.env.SPONGE_CREDENTIALS_PATH = originalCredentialsPath;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("records a successful command execution", async () => {
    await runCli(["logout"], {
      commandName: "spongewallet",
      packageName: "@paysponge/sdk",
      version: "0.1.39",
    });

    expect(capture).toHaveBeenCalledWith(expect.objectContaining({
      event: "cli_command",
      properties: expect.objectContaining({
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
      }),
    }));
    expect(shutdown).toHaveBeenCalledTimes(1);
  });
});
