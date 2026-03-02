import { type Credentials } from "../types/schemas.js";
export type { Credentials };
/**
 * Get the credentials directory path
 */
export declare function getCredentialsDir(customPath?: string): string;
/**
 * Get the credentials file path
 */
export declare function getCredentialsPath(customPath?: string): string;
/**
 * Load credentials from disk
 * @param customPath Optional custom path to the credentials file
 * @returns Credentials if found and valid, null otherwise
 */
export declare function loadCredentials(customPath?: string): Credentials | null;
/**
 * Save credentials to disk
 * @param credentials Credentials to save
 * @param customPath Optional custom path to the credentials file
 */
export declare function saveCredentials(credentials: Credentials, customPath?: string): void;
/**
 * Delete credentials from disk
 * @param customPath Optional custom path to the credentials file
 */
export declare function deleteCredentials(customPath?: string): void;
/**
 * Check if credentials exist
 * @param customPath Optional custom path to the credentials file
 */
export declare function hasCredentials(customPath?: string): boolean;
/**
 * Get API key from environment variable or credentials file
 * @param envVarName Name of the environment variable to check (default: SPONGE_API_KEY)
 * @param customPath Optional custom path to the credentials file
 */
export declare function getApiKey(envVarName?: string, customPath?: string): string | null;
/**
 * Get agent ID from credentials file
 * @param customPath Optional custom path to the credentials file
 */
export declare function getAgentId(customPath?: string): string | null;
//# sourceMappingURL=credentials.d.ts.map