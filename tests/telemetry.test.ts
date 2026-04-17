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

vi.mock("posthog-node", () => ({
  PostHog: posthogConstructor,
}));

import {
  captureCliCommandEvent,
  getTelemetryInstallId,
  getTelemetryStatePath,
  sanitizeErrorForTelemetry,
} from "../src/telemetry.js";

describe("CLI telemetry", () => {
  let tempDir: string;
  let credentialsPath: string;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    capture.mockClear();
    shutdown.mockClear();
    posthogConstructor.mockClear();
    process.env.NODE_ENV = "development";

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sponge-telemetry-"));
    credentialsPath = path.join(tempDir, "credentials.json");
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("persists a stable install ID next to the credentials directory", () => {
    const first = getTelemetryInstallId(credentialsPath);
    const second = getTelemetryInstallId(credentialsPath);

    expect(first).toBe(second);
    expect(fs.existsSync(getTelemetryStatePath(credentialsPath))).toBe(true);
  });

  it("captures command events with install-level identity", async () => {
    await captureCliCommandEvent({
      status: "succeeded",
      command_name: "logout",
      command_path: "logout",
      command_group: "logout",
      duration_ms: 12,
      raw_arg_count: 1,
      flags: [],
      auth_source: "interactive_or_public",
      has_cached_credentials: false,
      has_custom_credentials_path: true,
      base_url_kind: "default",
    }, credentialsPath);

    expect(posthogConstructor).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(expect.objectContaining({
      event: "cli_command",
      distinctId: expect.any(String),
      properties: expect.objectContaining({
        command_name: "logout",
        source: "spongewallet_cli",
        install_id: expect.any(String),
      }),
    }));
    expect(shutdown).toHaveBeenCalledTimes(1);
  });

  it("scrubs sensitive values out of telemetry error payloads", () => {
    const error = new Error(
      "Request failed for sponge_test_secret123 at https://api.wallet.paysponge.com/private"
    );

    expect(sanitizeErrorForTelemetry(error)).toEqual(expect.objectContaining({
      error_name: "Error",
      error_message:
        "Request failed for [redacted_api_key] at [redacted_url]",
    }));
  });
});
