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
export declare function classifyBaseUrl(baseUrl?: string): BaseUrlKind;
export declare function getTelemetryStatePath(customCredentialsPath?: string): string;
export declare function getTelemetryInstallId(customCredentialsPath?: string): string;
export declare function sanitizeErrorForTelemetry(error: unknown): {
    error_name?: string;
    error_code?: string;
    error_message?: string;
};
export declare function captureCliCommandEvent(event: CliCommandTelemetryEvent, customCredentialsPath?: string): Promise<void>;
export declare function captureCliAuthEvent(event: CliAuthTelemetryEvent, customCredentialsPath?: string): Promise<void>;
export declare function shutdownCliTelemetry(): Promise<void>;
export declare function hashTelemetryValue(value: string): string;
export {};
//# sourceMappingURL=telemetry.d.ts.map