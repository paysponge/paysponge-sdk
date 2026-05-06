import { ApiErrorSchema } from "../types/schemas.js";
import { SDK_VERSION } from "../version.js";
const DEFAULT_BASE_URL = "https://api.wallet.paysponge.com";
let versionNoticeHandler;
let versionNoticeShown = false;
export function setVersionNoticeHandler(handler) {
    versionNoticeHandler = handler;
    versionNoticeShown = false;
}
export function notifyVersionNotice(response) {
    if (!versionNoticeHandler || versionNoticeShown)
        return;
    const status = response.headers.get("Sponge-Version-Status");
    if (!status || status === "current")
        return;
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
    statusCode;
    errorCode;
    constructor(statusCode, errorCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.name = "SpongeApiError";
    }
}
export class HttpClient {
    baseUrl;
    apiKey;
    constructor(options) {
        this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
        this.apiKey = options.apiKey;
    }
    get headers() {
        return {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "Sponge-Version": SDK_VERSION,
        };
    }
    async get(path, params) {
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
        return this.handleResponse(response);
    }
    async post(path, body) {
        const url = new URL(path, this.baseUrl);
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        return this.handleResponse(response);
    }
    async put(path, body) {
        const url = new URL(path, this.baseUrl);
        const response = await fetch(url.toString(), {
            method: "PUT",
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        return this.handleResponse(response);
    }
    async delete(path) {
        const url = new URL(path, this.baseUrl);
        const response = await fetch(url.toString(), {
            method: "DELETE",
            headers: this.headers,
        });
        return this.handleResponse(response);
    }
    async handleResponse(response) {
        notifyVersionNotice(response);
        if (!response.ok) {
            let errorData = null;
            try {
                const json = await response.json();
                const parsed = ApiErrorSchema.safeParse(json);
                if (parsed.success) {
                    errorData = parsed.data;
                }
            }
            catch {
                // Ignore JSON parse errors
            }
            throw new SpongeApiError(response.status, errorData?.error ?? "unknown_error", errorData?.message ?? `HTTP ${response.status}: ${response.statusText}`);
        }
        // Handle 204 No Content
        if (response.status === 204) {
            return undefined;
        }
        return response.json();
    }
    /**
     * Get the base URL (for MCP config)
     */
    getBaseUrl() {
        return this.baseUrl;
    }
    /**
     * Get the API key (for MCP config)
     */
    getApiKey() {
        return this.apiKey;
    }
}
//# sourceMappingURL=http.js.map