import { ApiErrorSchema, type ApiError } from "../types/schemas.js";
import { SDK_VERSION } from "../version.js";

const DEFAULT_BASE_URL = "https://api.wallet.paysponge.com";

export interface HttpClientOptions {
  baseUrl?: string;
  apiKey: string;
}

export interface VersionNotice {
  status: string;
  latestSdkVersion?: string;
  minimumSdkVersion?: string;
  walletSkillVersion?: string;
  walletSkillUrl?: string;
  message?: string;
}

let versionNoticeHandler: ((notice: VersionNotice) => void) | undefined;
let versionNoticeShown = false;

export function setVersionNoticeHandler(handler: ((notice: VersionNotice) => void) | undefined) {
  versionNoticeHandler = handler;
  versionNoticeShown = false;
}

export function notifyVersionNotice(response: Response) {
  if (!versionNoticeHandler || versionNoticeShown) return;

  const status = response.headers.get("Sponge-Version-Status");
  if (!status || status === "current") return;

  versionNoticeShown = true;
  versionNoticeHandler({
    status,
    latestSdkVersion: response.headers.get("Sponge-Latest-Version") ?? undefined,
    minimumSdkVersion: response.headers.get("Sponge-Minimum-Version") ?? undefined,
    walletSkillVersion: response.headers.get("Sponge-Skill-Version") ?? undefined,
    walletSkillUrl: response.headers.get("Sponge-Skill-Url") ?? undefined,
    message: response.headers.get("Sponge-Version-Message") ?? undefined,
  });
}

export class SpongeApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "SpongeApiError";
  }
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.apiKey = options.apiKey;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "Sponge-Version": SDK_VERSION,
    };
  }

  async get<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.headers,
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: "PUT",
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<T> {
    const url = new URL(path, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: this.headers,
    });

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    notifyVersionNotice(response);

    if (!response.ok) {
      let errorData: ApiError | null = null;

      try {
        const json = await response.json();
        const parsed = ApiErrorSchema.safeParse(json);
        if (parsed.success) {
          errorData = parsed.data;
        }
      } catch {
        // Ignore JSON parse errors
      }

      throw new SpongeApiError(
        response.status,
        errorData?.error ?? "unknown_error",
        errorData?.message ?? `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get the base URL (for MCP config)
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the API key (for MCP config)
   */
  getApiKey(): string {
    return this.apiKey;
  }
}
