import * as fs from "node:fs";
import * as path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { PostHog } from "posthog-node";
import { getCredentialsDir } from "./auth/credentials.js";

const DEFAULT_POSTHOG_KEY = "phc_Nj6qTmjeWjGlyPAB8cUxvpOqVhCUV7azbRHACNQrTNV";
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
const TELEMETRY_STATE_FILE = "telemetry.json";
const FLUSH_TIMEOUT_MS = 400;

let posthogClient: PostHog | null = null;

type TelemetryStatus = "succeeded" | "failed";

export interface CliCommandTelemetryEvent {
  status: TelemetryStatus;
  command_name: string;
  command_path: string;
  command_group: string;
  duration_ms: number;
  raw_arg_count: number;
  flags: string[];
  auth_source: "env_api_key" | "cached_credentials" | "interactive_or_public";
  has_cached_credentials: boolean;
  has_custom_credentials_path: boolean;
  base_url_kind: BaseUrlKind;
  package_name?: string;
  package_version?: string;
  command_name_override?: string;
  error_name?: string;
  error_code?: string;
  error_message?: string;
}

export interface CliAuthTelemetryEvent {
  status: TelemetryStatus;
  auth_flow: "device_code";
  duration_ms: number;
  key_type: "agent" | "master";
  no_browser: boolean;
  has_email: boolean;
  has_agent_name: boolean;
  base_url_kind: BaseUrlKind;
  credentials_cached: boolean;
  error_name?: string;
  error_code?: string;
  error_message?: string;
}

export type BaseUrlKind = "default" | "localhost" | "custom";

interface TelemetryState {
  installId: string;
  createdAt: string;
}

export function classifyBaseUrl(baseUrl?: string): BaseUrlKind {
  if (!baseUrl || baseUrl === "https://api.wallet.paysponge.com") {
    return "default";
  }

  try {
    const url = new URL(baseUrl);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return "localhost";
    }
  } catch {
    return "custom";
  }

  return "custom";
}

export function getTelemetryStatePath(customCredentialsPath?: string): string {
  return path.join(getCredentialsDir(customCredentialsPath), TELEMETRY_STATE_FILE);
}

export function getTelemetryInstallId(customCredentialsPath?: string): string {
  const statePath = getTelemetryStatePath(customCredentialsPath);

  try {
    const content = fs.readFileSync(statePath, "utf8");
    const parsed = JSON.parse(content) as Partial<TelemetryState>;
    if (typeof parsed.installId === "string" && parsed.installId.length > 0) {
      return parsed.installId;
    }
  } catch {
    // Fall through to creating a new install ID.
  }

  const installId = randomUUID();
  const state: TelemetryState = {
    installId,
    createdAt: new Date().toISOString(),
  };

  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
  } catch {
    // If persistence fails, return the generated ID for this process only.
  }

  return installId;
}

export function sanitizeErrorForTelemetry(error: unknown): {
  error_name?: string;
  error_code?: string;
  error_message?: string;
} {
  if (!(error instanceof Error)) {
    return {};
  }

  const errorWithCode = error as Error & { code?: unknown };
  const code = typeof errorWithCode.code === "string"
    ? errorWithCode.code
    : undefined;

  return {
    error_name: error.name || "Error",
    error_code: code,
    error_message: scrubSensitiveText(error.message),
  };
}

export async function captureCliCommandEvent(
  event: CliCommandTelemetryEvent,
  customCredentialsPath?: string
): Promise<void> {
  await captureCliEvent("cli_command", event, customCredentialsPath);
}

export async function captureCliAuthEvent(
  event: CliAuthTelemetryEvent,
  customCredentialsPath?: string
): Promise<void> {
  await captureCliEvent("cli_device_flow_auth", event, customCredentialsPath);
}

export async function shutdownCliTelemetry(): Promise<void> {
  if (!posthogClient) {
    return;
  }

  const client = posthogClient;
  posthogClient = null;
  await withTimeout(client.shutdown(), FLUSH_TIMEOUT_MS);
}

function getClient(): PostHog | null {
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(getPostHogKey(), {
      host: getPostHogHost(),
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}

async function captureCliEvent(
  event: string,
  properties: object,
  customCredentialsPath?: string
): Promise<void> {
  const client = getClient();
  if (!client) {
    return;
  }

  const installId = getTelemetryInstallId(customCredentialsPath);

  try {
    client.capture({
      distinctId: installId,
      event,
      properties: {
        ...properties,
        install_id: installId,
        source: "spongewallet_cli",
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        is_ci: isTruthy(process.env.CI),
      },
    });

    await withTimeout(client.shutdown(), FLUSH_TIMEOUT_MS);
    posthogClient = null;
  } catch {
    // Telemetry must never block command execution.
  }
}

function getPostHogKey(): string {
  return process.env.SPONGE_POSTHOG_KEY
    || process.env.POSTHOG_API_KEY
    || process.env.NEXT_PUBLIC_POSTHOG_KEY
    || DEFAULT_POSTHOG_KEY;
}

function getPostHogHost(): string {
  return process.env.SPONGE_POSTHOG_HOST
    || process.env.POSTHOG_HOST
    || process.env.NEXT_PUBLIC_POSTHOG_HOST
    || DEFAULT_POSTHOG_HOST;
}

function isTruthy(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function scrubSensitiveText(value: string): string {
  return value
    .replace(/sponge_(?:live|test|master)_[A-Za-z0-9_-]+/g, "[redacted_api_key]")
    .replace(/https?:\/\/\S+/g, "[redacted_url]")
    .slice(0, 160);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

export function hashTelemetryValue(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
