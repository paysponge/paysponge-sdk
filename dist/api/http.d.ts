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
export declare function setVersionNoticeHandler(handler: ((notice: VersionNotice) => void) | undefined): void;
export declare function notifyVersionNotice(response: Response): void;
export declare class SpongeApiError extends Error {
    readonly statusCode: number;
    readonly errorCode: string;
    constructor(statusCode: number, errorCode: string, message: string);
}
export declare class HttpClient {
    private readonly baseUrl;
    private readonly apiKey;
    constructor(options: HttpClientOptions);
    private get headers();
    get<T>(path: string, params?: Record<string, string | undefined>): Promise<T>;
    post<T>(path: string, body?: unknown): Promise<T>;
    put<T>(path: string, body?: unknown): Promise<T>;
    delete<T>(path: string): Promise<T>;
    private handleResponse;
    /**
     * Get the base URL (for MCP config)
     */
    getBaseUrl(): string;
    /**
     * Get the API key (for MCP config)
     */
    getApiKey(): string;
}
//# sourceMappingURL=http.d.ts.map